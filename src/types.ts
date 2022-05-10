export type Maybe<T> = T | undefined;

export interface BidPayloadPostDto {
  bidAmount: string;
  tokenId: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
  bidToken: string;
}

export interface BidPostDto {
  account: string;
  bidNonce: string;
  tokenId: string;
  contractAddress: string;
  bidAmount: string;
  signedMessage: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
  bidToken: string;
}

export interface BidParams {
  account: string;
  bidNonce: string;
  bidAmount: string;
  minimumBid: string;
  contractAddress: string;
  startBlock: string;
  expireBlock: string;
  tokenId: string;
  bidToken: string;
}

export interface BidsList {
  [nftId: string]: Bid[] | undefined;
}

export interface BidsListDto {
  tokenIds: string[];
}

export interface BidsAccountsDto {
  account: string;
}

export interface BidsDto {
  tokenId: string;
}

export interface CancelledBid {
  cancelDate: number;
}

export interface Bid extends BidParams, Partial<CancelledBid> {
  date: number;
  signedMessage: string;
  version: string;
}

export interface HistoricBid extends Bid {
  nftId: string;
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
  bidNonce: string;
}

export enum BidFilterStatus {
  all = 0,
  active = 1,
  cancelled = 2,
}
