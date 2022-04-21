import * as fs from "fs";
import * as env from "env-var";
import * as dotenv from "dotenv";
import * as mongodb from "mongodb";
import { Bid, CancelledBid } from "../src/types";
import { MongoClientOptions } from "mongodb";
import { queueAdapters, MessageQueueService } from "../src/messagequeue";
import {
  MessageType,
  TypedMessage,
  BidPlacedV1Data,
  BidCancelledV1Data,
} from "@zero-tech/zns-message-schemas";
dotenv.config();

const argv = require("yargs").argv;
const outputFilename = "./scripts/output/zAuctionBidsHistorical.json";
const user = env.get("MONGO_USERNAME").required().asString();
const pass = env.get("MONGO_PASSWORD").required().asString();
const uri = env.get("MONGO_CLUSTER_URI").required().asString();
const dbName = env.get("MONGO_DB").required().asString();
const collectionName = env.get("MONGO_COLLECTION").required().asString();
const fullUri = `mongodb+srv://${user}:${pass}@${uri}/`;
const options: MongoClientOptions = {
  connectTimeoutMS: 5000,
  w: "majority",
};

const main = async () => {
  const client = new mongodb.MongoClient(fullUri, options);
  await client.connect();
  const database = client.db(dbName);
  const bidsPlaced = await getAllFromCollection<Bid>(collectionName, database);
  const bidsCancelled = await getAllFromCollection<CancelledBid>(
    collectionName + "-archive",
    database
  );
  client.close();

  const bidsPlacedMessages = bidsPlaced.map((x) => mapBidtoBidPlacedMessage(x));
  const bidsPlacedArchivedMessages = bidsCancelled.map((x) => mapBidtoBidPlacedMessage(x));
  const bidsCancelledMessages = bidsCancelled.map((x) =>
  mapCancelledBidtoBidCancelledMessage(x)
  );
  if (argv.output == "file") {
    await writeMessagesToOutputFile([
      bidsPlacedMessages,
      bidsPlacedArchivedMessages,
      bidsCancelledMessages,
    ]);
  } else {
    await sendEventsToEventHub(bidsPlacedMessages);         //Sending active bids
    await sendEventsToEventHub(bidsPlacedArchivedMessages); //Sending bids that were archived
    await sendEventsToEventHub(bidsCancelledMessages);      //Sending bids that were archived, as cancellation messages
  }
};
main();

async function getAllFromCollection<T>(
  collectionName: string,
  databaseClient: mongodb.Db
): Promise<T[]> {
  const collection = databaseClient.collection(collectionName);
  var result = await collection.find<T>({}).toArray();
  console.log(
    `${result.length} items retrieved from DB collection ${collectionName}`
  );
  return result;
}

async function writeMessagesToOutputFile<T>(messages: TypedMessage<BidPlacedV1Data | BidCancelledV1Data>[][]) {
  const flat = messages.flat();
  fs.writeFileSync(outputFilename, JSON.stringify(flat));
  console.log(`${flat.length} messages written to output file`);
}

async function sendEventsToEventHub<T>(messages: TypedMessage<BidPlacedV1Data | BidCancelledV1Data>[]) {
  const connectionString = env
  .get("EVENT_HUB_MIGRATION_CONNECTION_STRING")
  .required()
  .asString();
  const name = env.get("EVENT_HUB_MIGRATION_NAME").required().asString();
  const queue: MessageQueueService = queueAdapters.eventhub.create(
    connectionString,
    name
  );

  await queue.sendMessagesBatch(messages, {});
}

function mapBidtoBidPlacedMessage(bid: Bid): TypedMessage<BidPlacedV1Data> {
  const message: TypedMessage<BidPlacedV1Data> = {
    event: MessageType.BidPlaced,
    version: "1.0",
    timestamp: bid.date, //use date of bid
    logIndex: undefined,
    blockNumber: undefined,
    data: {
      //explicitly set fields, strip _id
      bidNonce: bid.bidNonce,
      version: bid.version ?? "1.0", //set version 1.0 by default
      nftId: bid.nftId,
      account: bid.account,
      bidAmount: bid.bidAmount,
      minimumBid: bid.minimumBid,
      contractAddress: bid.contractAddress,
      startBlock: bid.startBlock,
      expireBlock: bid.expireBlock,
      tokenId: bid.tokenId,
      date: bid.date,
      signedMessage: bid.signedMessage,
    },
  };
  return message;
}

function mapCancelledBidtoBidCancelledMessage(
  bid: CancelledBid
): TypedMessage<BidCancelledV1Data> {
  const message: TypedMessage<BidCancelledV1Data> = {
    event: MessageType.BidCancelled,
    version: "1.0",
    timestamp: new Date().getTime(),
    logIndex: undefined,
    blockNumber: undefined,
    data: {
      account: bid.account, //account instead of signer
      bidNonce: bid.bidNonce,
      version: bid.version ?? "1.0", //set version 1.0 by default
      cancelDate: bid.cancelDate ?? 0 
    },
  };
  return message;
}
