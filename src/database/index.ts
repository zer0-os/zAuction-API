import { Bid, BidFilterStatus, CancelledBid } from "../types";
export * from "./adapters";

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  insertBids: (data: Bid[]) => Promise<boolean>;
  getBidsByTokenIds: (nftIds: string[]) => Promise<Bid[]>;
  getBidsByAccount: (account: string, bidStatus: BidFilterStatus) => Promise<Bid[]>;
  getBidBySignedMessage: (signedMessage: string) => Promise<Bid | null>;
  cancelBid: (bid: CancelledBid, archiveCollection: string) => Promise<boolean>;
}
