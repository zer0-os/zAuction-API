import { Bid } from "../types";

/* if any of these get imported outside of the `database` folder, something is wrong */

export interface Version1BidParams {
  nftId: string;
  account: string;
  auctionId: string;
  bidAmount: string;
  minimumBid: string;
  contractAddress: string;
  startBlock: string;
  expireBlock: string;
  tokenId: string;
}

export interface BidVersion1 extends Version1BidParams {
  date: number;
  signedMessage: string;
}

export type UncertainBid = Bid & BidVersion1;