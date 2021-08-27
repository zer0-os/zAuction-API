
import * as env from "env-var";
export * from "./contracts";
export * from "./auctions";

export function isProduction(): boolean {
  const environment: string = env.get("ENVIRONMENT").default("prod").asString();
  const isProd = environment === "prod";
  return isProd;
}
