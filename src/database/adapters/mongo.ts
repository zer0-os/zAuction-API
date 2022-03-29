import { InsertOneResult, Document, InsertManyResult } from "mongodb";

import { BidDatabaseService } from "..";
import { Bid } from "../../types";
import * as mongo from "../backends/mongo";
import { UncertainBid } from "../types";

const uncertainBidToBid = (bid: UncertainBid): Bid => {
  const properBid: Bid = {
    ...bid,
    version: bid.version ?? "1.0",
    bidNonce: bid.bidNonce ?? bid.auctionId,
  };

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

  const getBidsByNftIds = async (nftIds: string[]): Promise<Bid[]> => {
    const nftIdList = [...nftIds];
    const versionlessResult: UncertainBid[] = await mongo.find(
      database,
      usedCollection,
      {
        nftId: {
          $in: nftIdList,
        },
      }
    );

    const result: Bid[] = mapBids(versionlessResult);
    return result;
  };

  const getBidsByAccount = async (account: string): Promise<Bid[]> => {
    const maybeResult: UncertainBid[] = await mongo.find(
      database,
      usedCollection,
      {
        account: `${account}`,
      }
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
    archiveCollection: string
  ): Promise<boolean> => {
    // Place bid into archive collection, then delete
    const insertResult: InsertOneResult = await mongo.insertOne(
      bid,
      database,
      archiveCollection
    );

    if (!insertResult.acknowledged) {
      throw Error(
        `Failed to cancel bid with signed message: ${bid.signedMessage}`
      );
    }

    const result: boolean = await mongo.deleteOne(database, usedCollection, {
      signedMessage: `${bid.signedMessage}`,
    });
    return result;
  };

  const databaseService = {
    insertBid,
    insertBids,
    getBidsByNftIds,
    getBidsByAccount,
    getBidBySignedMessage,
    cancelBid,
  };

  return databaseService;
};