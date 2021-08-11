import { ethers } from "ethers";
import { StorageService } from "../storage";
import { Auction, Bid } from "../types";

export * from "./contracts";

export async function getBidsForNft(storage: StorageService, nftId: string): Promise<Bid[]> {
  try {
    const fileContents = await storage.downloadFile(nftId);
    const auction = JSON.parse(fileContents) as Auction;
    return auction.bids
  } catch {

  }

  return [];
}

export function calculateNftId(contractAddress: string, tokenId: string) {
  const idString = contractAddress + tokenId;
  const idStringBytes = ethers.utils.toUtf8Bytes(idString);
  const nftId = ethers.utils.keccak256(idStringBytes);

  return nftId;
}