export type Maybe<T> = T | undefined;

export interface BidPayloadPostDto {
  bidAmount: string;
  tokenId: string;
  contractAddress: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
}

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

export interface BidParams {
  account: string;
  auctionId: string;
  bidAmount: string;
  contractAddress: string;
  tokenId: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
}

export interface BidsList {
  [nftId: string]: Bid[] | undefined;
}

export interface BidsListDto {
  nftIds: string[];
}

export interface BidsAccountsDto {
  account: string;
}

export interface BidsDto {
  nftId: string;
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

export interface VerifyBidResponse {
  pass: boolean;
  status: number;
  message: string;
}
