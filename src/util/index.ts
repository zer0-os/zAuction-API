import { ethers } from "ethers";
import { StorageService } from "../storage";
import { Auction, Bid } from "../types";
import * as env from "env-var";

export * from "./contracts";

export async function getBidsForNft(
  storage: StorageService,
  nftId: string
): Promise<Bid[]> {
  try {
    const fileContents = await storage.downloadFile(nftId);
    const auction = JSON.parse(fileContents) as Auction;
    return auction.bids;
  } catch {
    return [];
  }
}

export function calculateNftId(
  contractAddress: string,
  tokenId: string
): string {
  const idString = contractAddress + tokenId;
  const idStringBytes = ethers.utils.toUtf8Bytes(idString);
  const nftId = ethers.utils.keccak256(idStringBytes);

  return nftId;
}

export function isProduction(): boolean {
  const environment: string = env.get("ENVIRONMENT").default("prod").asString();
  const isProd = environment === "prod";
  return isProd;
}
