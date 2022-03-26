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
  bidNonce: string;
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
  bidNonce: string;
  bidAmount: string;
  minimumBid: string;
  contractAddress: string;
  startBlock: string;
  expireBlock: string;
  tokenId: string;
}

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

export interface BidsList {
  [nftId: string]: UncertainBid[] | undefined;
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
  version: string;
}
export interface BidVersion1 extends Version1BidParams {
  date: number;
  signedMessage: string;
}

export type UncertainBid = Bid & BidVersion1;

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
