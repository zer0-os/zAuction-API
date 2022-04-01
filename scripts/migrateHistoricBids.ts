import * as fs from "fs";
import * as env from "env-var";
import * as dotenv from "dotenv";
import * as mongodb from "mongodb";
import { Bid } from "../src/types";
import { MongoClientOptions } from "mongodb";
import {
  MessageType,
  TypedMessage,
  BidPlacedV1Data,
  BidCancelledV1Data,
} from "@zero-tech/zns-message-schemas";
dotenv.config();

const outputFilename = "./output/zAuctionBidsHistorical.json";
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
  const bidsCol = database.collection(collectionName);
  const cancelCol = database.collection(collectionName + "-archive");

  const bidsPlaced = await bidsCol.find<Bid>({}).toArray();
  console.log(`${bidsPlaced.length} Bids placed retrieved from DB`);
  const bidsCancelled = await cancelCol.find<Bid>({}).toArray();
  console.log(`${bidsCancelled.length} Bids cancelled retrieved from DB`);
  client.close();

  const bidsPlacedMessages = bidsPlaced.map((x) => mapBidtoBidPlacedMessage(x));
  const bidsCancelledMessages = bidsCancelled.map((x) =>
    mapBidtoBidCancelledMessage(x)
  );

  fs.writeFileSync(
    outputFilename,
    JSON.stringify({
      bidsPlaced: bidsPlacedMessages,
      bidsCancelled: bidsCancelledMessages,
    })
  );
  console.log(
    `${
      bidsPlacedMessages.length + bidsCancelledMessages.length
    } messages written to output file`
  );
};
main();

function mapBidtoBidPlacedMessage(bid: Bid): TypedMessage<BidPlacedV1Data> {
  const message: TypedMessage<BidPlacedV1Data> = {
    event: MessageType.BidPlaced,
    version: "1.0",
    timestamp: bid.date, //Use date of bid
    logIndex: undefined,
    blockNumber: undefined,
    data: {
      ...bid,
      auctionId: bid.bidNonce,
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
      account: bid.account, //Account instead of signer?
      auctionId: bid.bidNonce,
    },
  };
  return message;
}
