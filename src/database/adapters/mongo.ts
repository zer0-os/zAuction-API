import { InsertOneResult, Document, InsertManyResult } from "mongodb";

import { BidDatabaseService } from "..";
import { Bid } from "../../types";
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

  const getBidsByNftIds = async (nftIds: string[]): Promise<Bid[]> => {
    const nftIdList = [...nftIds];
    const result: Bid[] = await mongo.find(database, usedCollection, {
      nftId: {
        $in: nftIdList,
      },
    });
    return result;
  };

  const getBidsByAccount = async (account: string): Promise<Bid[]> => {
    const result: Bid[] = await mongo.find(database, usedCollection, {
      account: `${account}`,
    });
    return result;
  };

  const databaseService = {
    insertBid,
    insertBids,
    getBidsByNftIds,
    getBidsByAccount,
  };

  return databaseService;
};
