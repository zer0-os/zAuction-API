export type Maybe<T> = T | undefined;

export interface Bid {
  account: string;
  signedMessage: string;
  auctionId: string;
  bidAmount: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
  date: number;
}

export interface AuctionBid extends Bid {
  tokenId: string;
  contractAddress: string;
}

export interface Auction {
  tokenId: string;
  contractAddress: string;
  bids: Bid[];
}
