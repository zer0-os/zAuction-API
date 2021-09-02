export * from "./contracts";
export * from "./auctions";

import { adapters, StorageService } from "../storage";

export function isProduction(): boolean {
  const environment = process.env.ENVIRONMENT || "prod"; //.default("prod").asString();
  const isProd = environment === "prod";
  return isProd;
}

export function getFleekConnection(): StorageService {
  const fleekBucket = process.env.STORAGE_BUCKET || ""
  const fileNamespace = process.env.NAMESPACE || "";
  if(!fleekBucket || !fileNamespace) {
    throw new ReferenceError("Could not connect to Fleek")
  }
  const storage = adapters.fleek.create(fleekBucket, fileNamespace);

  return storage;
}
