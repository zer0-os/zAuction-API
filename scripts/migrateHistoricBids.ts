import * as fs from "fs";
import * as env from "env-var";
import * as dotenv from "dotenv";
import * as mongodb from "mongodb";
import { Bid, HistoricBid } from "../src/types";
import { MongoClientOptions, Filter, Document } from "mongodb";
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
const cancelledQuery = { cancelDate: { $gte: 1 } };

const main = async () => {
  const client = new mongodb.MongoClient(fullUri, options);
  await client.connect();
  const database = client.db(dbName);
  const bidsPlaced = await getFromCollection<HistoricBid>(
    collectionName,
    database,
    {}
  );
  const bidsCancelled = await getFromCollection<Bid>(
    collectionName,
    database,
    cancelledQuery
  );
  //Temporarily using archived collection until it is deprecated.
  const bidsCancelledArchived = await getFromCollection<HistoricBid>(
    collectionName + "-archive",
    database,
    {}
  );
  client.close();

  const bidsPlacedMessages = bidsPlaced.map((bid) =>
    mapBidtoBidPlacedMessage(bid)
  );
  const bidsPlacedArchivedMessages = bidsCancelledArchived.map((bid) =>
    mapBidtoBidPlacedMessage(bid)
  ); //Remove when archive collections are deprecated
  const bidsCancelledMessages = bidsCancelled.map((bid) =>
    mapBidtoBidCancelledMessage(bid)
  );
  const bidsCancelledArchivedMessages = bidsCancelledArchived.map(
    (
      bid //Remove when archive collections are deprecated
    ) => mapBidtoBidCancelledMessage(bid)
  );

  if (argv.output == "file") {
    await writeMessagesToOutputFile([
      bidsPlacedMessages,
      bidsPlacedArchivedMessages,
      bidsCancelledMessages,
      bidsCancelledArchivedMessages,
    ]);
  } else {
    await sendEventsToEventHub(bidsPlacedMessages); //Sending active bids
    await sendEventsToEventHub(bidsPlacedArchivedMessages); //Sending bids that were archived
    await sendEventsToEventHub(bidsCancelledMessages); //Sending bids that were cancelled, as cancellation messages
    await sendEventsToEventHub(bidsCancelledArchivedMessages); //Sending bids that were archived, as cancellation messages
  }
};
main();

async function getFromCollection<T>(
  collectionName: string,
  databaseClient: mongodb.Db,
  filter: Filter<Document>
): Promise<T[]> {
  const collection = databaseClient.collection(collectionName);
  var result = await collection.find<T>(filter).toArray();
  console.log(
    `${result.length} items retrieved from DB collection ${collectionName}`
  );
  return result;
}

async function writeMessagesToOutputFile<T>(
  messages: TypedMessage<BidPlacedV1Data | BidCancelledV1Data>[][]
) {
  const flat = messages.flat();
  fs.writeFileSync(outputFilename, JSON.stringify(flat));
  console.log(`${flat.length} messages written to output file`);
}

async function sendEventsToEventHub<T>(
  messages: TypedMessage<BidPlacedV1Data | BidCancelledV1Data>[]
) {
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

function mapBidtoBidPlacedMessage(
  bid: HistoricBid
): TypedMessage<BidPlacedV1Data> {
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

function mapBidtoBidCancelledMessage(
  bid: Bid
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
      cancelDate: bid.cancelDate ?? 1,
    },
  };
  return message;
}
