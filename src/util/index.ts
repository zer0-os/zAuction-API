export * from "./contracts";
export * from "./auctions";

import * as env from "env-var";

export function isProduction(): boolean {
  const environment = env.get("ENVIRONMENT").default("prod").asString();
  const isProd = environment === "prod";
  return isProd;
}
