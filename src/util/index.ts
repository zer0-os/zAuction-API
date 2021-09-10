export * from "./contracts";
export * from "./auctions";

import * as env from "env-var";
import { adapters, StorageService } from "../storage";

export function isProduction(): boolean {
  const environment = env.get("ENVIRONMENT").default("prod").asString();
  const isProd = environment === "prod";
  return isProd;
}

export function getFleekConnection(): StorageService {
  const fleekBucket = env.get("STORAGE_BUCKET").required().asString();
  const fileNamespace = env.get("NAMESPACE").required().asString();
  if (!fleekBucket || !fileNamespace) {
    throw new ReferenceError("Could not connect to Fleek");
  }
  const storage = adapters.fleek.create(fleekBucket, fileNamespace);

  return storage;
}
