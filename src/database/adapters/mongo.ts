import { InsertOneResult, Document, InsertManyResult, Filter, UpdateResult } from "mongodb";
import { BidDatabaseService } from "..";
import { Bid, BidFilterStatus } from "../../types";
import * as mongo from "../backends/mongo";
import { addFilterByBidStatus } from "../helpers/dynamicQueryBuilder";
import { UncertainBid } from "../types";

const uncertainBidToBid = (bid: UncertainBid): Bid => {
  const properBid: Bid = {
    ...bid,
    version: bid.version ?? "1.0",
    bidNonce: bid.bidNonce ?? bid.auctionId,
  };

  //Strip signed message if bid has been cancelled
  if (properBid.cancelDate && properBid.cancelDate > 0)
  {
    properBid.signedMessage = "";
  }
  return properBid;
};

const mapBids = (bids: UncertainBid[]): Bid[] => bids.map(uncertainBidToBid);

export const create = (db: string, collection: string): BidDatabaseService => {
  const database = db;
  const usedCollection = collection;

  const insertBid = async (data: Bid): Promise<boolean> => {
    const result: InsertOneResult<Document> = await mongo.insertOne(
      data,
      database,
      usedCollection
    );

    return result.acknowledged;
  };

  const insertBids = async (data: Bid[]): Promise<boolean> => {
    const result: InsertManyResult<Document> = await mongo.insertMany(
      data,
      database,
      usedCollection
    );

    return result.acknowledged;
  };

  const getBidsByTokenIds = async (tokenIds: string[], bidStatus: BidFilterStatus): Promise<Bid[]> => {
    const tokenIdList = [...tokenIds];
    let queryWrapper : Filter<Document> = {
      tokenId: {
        $in: tokenIdList,
      },
    }
    queryWrapper = addFilterByBidStatus(queryWrapper, bidStatus);    
    const versionlessResult: UncertainBid[] = await mongo.find(
      database,
      usedCollection,
      queryWrapper
    );

    const result: Bid[] = mapBids(versionlessResult);
    return result;
  };

  const getBidsByAccount = async (account: string, bidStatus: BidFilterStatus): Promise<Bid[]> => {
    let queryWrapper : Filter<Document> = {
      account: `${account}`,
    }
    queryWrapper = addFilterByBidStatus(queryWrapper, bidStatus);    
    const maybeResult: UncertainBid[] = await mongo.find(
      database,
      usedCollection,
      queryWrapper
    );

    const result: Bid[] = mapBids(maybeResult);
    return result;
  };

  const getBidBySignedMessage = async (
    signedMessage: string
  ): Promise<Bid | null> => {
    const maybeResult: UncertainBid | null = await mongo.findOne(
      database,
      collection,
      {
        signedMessage: `${signedMessage}`,
      }
    );

    if (!maybeResult) {
      return null;
    }

    const bid = uncertainBidToBid(maybeResult);
    return bid;
  };

  const cancelBid = async (
    bid: Bid,
    collection: string
  ): Promise<boolean> => {
    const result: UpdateResult = await mongo.updateOne({$set: {cancelDate: bid.cancelDate as number}}, database, collection, {
      signedMessage: `${bid.signedMessage}`,
    });
    
    if (!result.acknowledged || result.modifiedCount !== 1) {
      throw Error(
        `Unable to cancel bid with signed message: ${bid.signedMessage}`
      );
    }
    return result.acknowledged;
  };

  const databaseService = {
    insertBid,
    insertBids,
    getBidsByTokenIds,
    getBidsByAccount,
    getBidBySignedMessage,
    cancelBid,
  };

  return databaseService;
};
