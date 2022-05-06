import * as env from "env-var";
import fleekStorage, {
  getInput,
  getOutput,
  listBucketsOutput,
  listFilesInput,
  listFilesOutput,
} from "@fleekhq/fleek-storage-js";

require("dotenv").config();

import { FleekAuth } from "./types";
import { Bid, Auction } from "../types";
import { adapters, BidDatabaseService } from "../database/";

const db = env.get("MONGO_DB").required().asString();
const collection = env.get("MONGO_COLLECTION").required().asString();
const database: BidDatabaseService = adapters.mongo.create(db, collection);

const fleekAuth = (): FleekAuth => {
  return {
    apiKey: env.get(`FLEEK_STORAGE_API_KEY`).required().asString(),
    apiSecret: env.get(`FLEEK_STORAGE_API_SECRET`).required().asString(),
  } as FleekAuth;
};

const getAllBuckets = async (auth: FleekAuth): Promise<listBucketsOutput[]> => {
  try {
    const buckets: listBucketsOutput[] = await fleekStorage.listBuckets(auth);
    return buckets;
  } catch (error) {
    throw error;
  }
};

const getAllFileKeys = async (
  auth: FleekAuth,
  buckets: listBucketsOutput[],
  folder: string
): Promise<listFilesOutput[]> => {
  const allFiles: listFilesOutput[] = [];

  for (const index in buckets) {
    const request: listFilesInput = {
      ...auth,
      bucket: buckets[index].name,
      prefix: folder,
    };

    try {
      const files: listFilesOutput[] = await fleekStorage.listFiles(request);
      allFiles.push(...files);
    } catch (error) {
      throw error;
    }
  }

  return allFiles;
};

const getFile = async (auth: FleekAuth, fileInfo: listFilesOutput) => {
  if (fileInfo.key && fileInfo.bucket) {
    const input: getInput = {
      ...auth,
      key: fileInfo.key,
      bucket: fileInfo.bucket,
    };

    try {
      // Get file from fleek and parse as JSON
      const outputFile: getOutput = await fleekStorage.get(input);
      const fileData = JSON.parse(outputFile.data);
      return fileData;
    } catch (error) {
      throw error;
    }
  }
};

async function migrateExistingBids(auth: FleekAuth) {
  const buckets: listBucketsOutput[] = await getAllBuckets(auth);

  const folder = "mainnet0/";
  const fileKeys: listFilesOutput[] = await getAllFileKeys(
    auth,
    buckets,
    folder
  );

  const bids: Bid[] = [];

  for (const fileKey of fileKeys) {
    const file: Auction = await getFile(auth, fileKey);

    // Intentionally ignore top level `tokenId`
    // and `contractAddress` props, they are already in Bid
    for (const bid of file.bids) {
      const newBid = {
        ...bid,
      };
      bids.push(newBid);
    }
  }

  const result = await database.insertBids(bids);
  return result;
}

(async () => {
  try {
    const auth: FleekAuth = fleekAuth();
    const result: boolean = await migrateExistingBids(auth);
    console.log(result);
  } catch (error) {
    console.log(error);
  }
})();
