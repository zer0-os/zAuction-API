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

export interface Bid extends BidParams {
  date: number;
  signedMessage: string;
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

export interface BidCancelEncode {
  bidMessageSignature: string;
}
export interface BidCancelDto extends BidCancelEncode {
  cancelMessageSignature: string;
}

export interface BidCancellation {
  account: string;
  auctionId: string;
}

export interface BaseMessage {
  event: string;
  timestamp: number;
}
export interface BidPlacedMessage extends BaseMessage {
  version: "1.0";
  data: Bid;
}

export interface BidCancelledMessage extends BaseMessage {
  version: "1.0";
  data: BidCancellation;
}
