import { InsertOneResult, Document, InsertManyResult } from "mongodb";

import { BidDatabaseService } from "..";
import { Bid, MaybeBid } from "../../types";
import * as mongo from "../backends/mongo";

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

  const getBidsByNftIds = async (nftIds: string[]): Promise<MaybeBid[]> => {
    const nftIdList = [...nftIds];
    const result: MaybeBid[] = await mongo.find(database, usedCollection, {
      nftId: {
        $in: nftIdList,
      },
    });
    return result;
  };

  const getBidsByAccount = async (account: string): Promise<MaybeBid[]> => {
    const result: MaybeBid[] = await mongo.find(database, usedCollection, {
      account: `${account}`,
    });
    return result;
  };

  const getBidBySignedMessage = async (
    signedMessage: string
  ): Promise<MaybeBid | null> => {
    const result: MaybeBid | null = await mongo.findOne(database, collection, {
      signedMessage: `${signedMessage}`,
    });
    return result;
  };

  const cancelBid = async (bid: MaybeBid, archiveCollection: string): Promise<boolean> => {
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
