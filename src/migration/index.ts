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

const getBuckets = async (auth: FleekAuth): Promise<listBucketsOutput[]> => {
  try {
    const buckets: listBucketsOutput[] = await fleekStorage.listBuckets(auth);
    return buckets;
  } catch (error) {
    throw error;
  }
};

const getFileKeys = async (
  auth: FleekAuth,
  buckets: listBucketsOutput[]
): Promise<listFilesOutput[]> => {
  let allFiles: listFilesOutput[] = [];

  // Can't use .forEach to iterate here as we're
  // unable to affect variables outside that scope
  for (const index in buckets) {
    const request: listFilesInput = {
      ...auth,
      bucket: buckets[index].name,
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
      // Get file from fleek and try to parse as JSON
      const outputFile: getOutput = await fleekStorage.get(input);
      const fileData = JSON.parse(outputFile.data);
      return fileData;
    } catch (error) {
      // Using a "throw" will halt execution
      // but some failures are expected in parsing
      // as they are not JSON objects (e.g. pictures, videos)
      console.log(error);
    }
  }
};

async function migrateExistingBids(auth: FleekAuth) {
  const buckets: listBucketsOutput[] = await getBuckets(auth);
  const files: listFilesOutput[] = await getFileKeys(auth, buckets);

  let bids = [];
  for (let i = 0; i < files.length; i++) {
    const fileInfo: listFilesOutput = files[i];
    const file = await getFile(auth, fileInfo);

    console.log("f: ", file);
    if (file && file.bids) {
      bids.push(file);
    } else if (Array.isArray(file)) {
      bids.push(...file);
    }
  }

  const result = await database.insertBids(bids);
  return result;
}

(async () => {
  try {
    const auth: FleekAuth = fleekAuth();
    await migrateExistingBids(auth);
  } catch (error) {
    console.log(error);
  }
})();
