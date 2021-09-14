import { InsertOneResult, Filter, Document, DeleteResult } from "mongodb";
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

  const getBidsByNftId = async (nftId: string): Promise<Bid[]> => {
    const result: Bid[] = await mongo.find(database, usedCollection, {
      nftId: `${nftId}`,
    });
    return result;
  };

  const getBidsByAccount = async (account: string): Promise<Bid[]> => {
    const result: Bid[] = await mongo.find(database, usedCollection, {
      account: `${account}`,
    });
    return result;
  };

  const storageService = {
    insertBid,
    getBidsByNftId,
    getBidsByAccount,
  };

  return storageService;
};
