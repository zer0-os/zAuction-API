import * as env from "env-var";
export * from "./contracts";
export * from "./auctions";

import { adapters, StorageService } from "../storage";

export function isProduction(): boolean {
  const environment: string = env.get("ENVIRONMENT").default("prod").asString();
  const isProd = environment === "prod";
  return isProd;
}

export function getFleekConnection(): StorageService {
  const fleekBucket = env.get("STORAGE_BUCKET").asString();
  const fileNamespace = env.get("NAMESPACE").asString();
  const storage = adapters.fleek.create(fleekBucket, fileNamespace);

  return storage;
}
