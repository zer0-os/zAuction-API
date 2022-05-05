import { Bid, BidFilterStatus, CancelableBid } from "../types";
export * from "./adapters";

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  insertBids: (data: Bid[]) => Promise<boolean>;
  getBidsByTokenIds: (nftIds: string[], bidStatus: BidFilterStatus) => Promise<Bid[]>;
  getBidsByAccount: (account: string, bidStatus: BidFilterStatus) => Promise<Bid[]>;
  getBidBySignedMessage: (signedMessage: string) => Promise<CancelableBid | null>;
  cancelBid: (bid: CancelableBid, collection: string) => Promise<boolean>;
}
