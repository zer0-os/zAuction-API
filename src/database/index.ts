import { Bid } from "../types";
export * from "./adapters";

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  insertBids: (data: Bid[]) => Promise<boolean>;
  getBidsByNftId: (nftId: string) => Promise<Bid[]>;
  getBidsByAccount: (account: string) => Promise<Bid[]>;
  getBidBySignedMessage: (signedMessage: string) => Promise<Bid | null>;
  cancelBid: (bid: Bid, archiveCollection: string) => Promise<boolean>;
}
