import { Bid } from "../types"

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  getBidsByNftId: (nftId: string) => Promise<Bid[]>;
  getBidsByAccount: (account: string) => Promise<Bid[]>;
}
