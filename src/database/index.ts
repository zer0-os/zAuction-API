import { Bid } from "../types";
export * from "./adapters";

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  insertBids: (data: Bid[]) => Promise<boolean>;
  getBidsByNftIds: (nftIds: string[]) => Promise<Bid[]>; // TODO better typing than "any" type
  getBidsByAccount: (account: string) => Promise<Bid[]>;
}
