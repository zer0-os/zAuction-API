import { Bid, UncertainBid } from "../types";
export * from "./adapters";

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  insertBids: (data: Bid[]) => Promise<boolean>;
  getBidsByNftIds: (nftIds: string[]) => Promise<Bid[]>;
  getBidsByAccount: (account: string) => Promise<Bid[]>;
  getBidBySignedMessage: (signedMessage: string) => Promise<UncertainBid | null>;
  cancelBid: (bid: UncertainBid, archiveCollection: string) => Promise<boolean>;
}
