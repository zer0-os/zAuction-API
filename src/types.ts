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
export interface BidCancelDto extends BidCancelEncode{
  cancelMessageSignature: string;
}

export interface CreateBidEvent {
  event: string;
  nftId: string;
  tokenId: string;
  contractAddress: string;
  account: string;
  amount: string;
  auctionId: string;
  signedMessage: string;
  date: number;
}

export interface CancelBidEvent  {
  event: string;
  nftId: string;
  tokenId: string;
  contractAddress: string;
  account: string;
  amount: string;
  auctionId: string;
  signedMessage: string;
  date: number;
}

