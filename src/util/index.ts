import { StorageService } from "storage";
import { Auction, Bid } from "types";

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