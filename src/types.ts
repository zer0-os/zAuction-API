export type Maybe<T> = T | undefined;

export interface BidPostDto {
  account: string;
  auctionId: string;
  tokenId: string;
  contractAddress: string;
  bidAmount: string;
  signedMessage: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
}

export interface Bid {
  account: string;
  signedMessage: string;
  auctionId: string;
  bidAmount: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
  date: number;
  tokenId: string;
  contractAddress: string;
}

export interface Auction {
  tokenId: string;
  contractAddress: string;
  bids: Bid[];
}

export interface UserAccount {
  bids: Bid[];
}