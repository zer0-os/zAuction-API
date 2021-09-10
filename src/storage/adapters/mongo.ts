import { InsertOneResult, FindCursor, Document } from "mongodb";
import { MongoStorageService } from "..";
import { Bid } from "../../types";

import * as mongo from "../backends/mongo";

export const create = (db: string, collection: string): MongoStorageService => {
  const database = db;
  const usedCollection = collection;

  const uploadData = async (data: Bid): Promise<InsertOneResult<Document>> => {
    const result: InsertOneResult<Document> = await mongo.insertOne(
      data,
      database,
      usedCollection
    );
    return result;
  };

  // maybe two calls, find and findOne to be more specific?
  const queryData = async (query?: Object): Promise<Document[]> => {
    const results: Document[] = await mongo.find(db, collection, query);
    return results;
  };

  const deleteData = () => {
    // TODO implement
    return Promise.resolve("");
  };

  const storageService = {
    uploadData,
    queryData,
    deleteData,
  };

  return storageService;
};
