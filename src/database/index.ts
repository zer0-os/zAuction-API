import { Bid, MaybeBid } from "../types";
export * from "./adapters";

export interface BidDatabaseService {
  insertBid: (bid: Bid) => Promise<boolean>;
  insertBids: (data: Bid[]) => Promise<boolean>;
  getBidsByNftIds: (nftIds: string[]) => Promise<MaybeBid[]>;
  getBidsByAccount: (account: string) => Promise<MaybeBid[]>;
  getBidBySignedMessage: (signedMessage: string) => Promise<MaybeBid | null>;
  cancelBid: (bid: MaybeBid, archiveCollection: string) => Promise<boolean>;
}
