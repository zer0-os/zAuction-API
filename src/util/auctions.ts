import { ethers } from "ethers";
import { StorageService, SafeDownloadedFile } from "../storage";
import { ERC20, Zauction } from "../types/contracts";

import { Auction, Bid, VerifyBidResponse, Maybe, BidParams } from "../types";

import { getEthersProvider, encodeBid, getTokenContract, getZAuctionContract } from "./contracts";

export async function getBidsForNft(
  storage: StorageService,
  nftId: string
): Promise<Bid[]> {
  try {
    const fileContents = await storage.downloadFile(nftId);
    const auction = JSON.parse(fileContents) as Auction;
    return auction.bids;
  } catch {
    return [];
  }
}

export function calculateNftId(
  contractAddress: string,
  tokenId: string
): string {
  const idString = contractAddress + tokenId;
  const idStringBytes = ethers.utils.toUtf8Bytes(idString);
  const nftId = ethers.utils.keccak256(idStringBytes);

  return nftId;
}

async function calculateSigningAccount(
  bidData: BidParams,
  signedMessage: string,
  zAuctionContract: Zauction
): Promise<string> {
  // Check signature recovers correct account
  const bidMessage = await encodeBid(
    bidData.auctionId,
    bidData.bidAmount,
    bidData.contractAddress,
    bidData.tokenId,
    bidData.minimumBid,
    bidData.startBlock,
    bidData.expireBlock
  );

  const unsignedMessage = await zAuctionContract.toEthSignedMessageHash(
    bidMessage
  );

  const recoveredAccount = await zAuctionContract.recover(
    unsignedMessage,
    signedMessage
  );

  return recoveredAccount;
}

export async function verifyEncodedBid(
  params: BidParams,
  signedMessage: string,
  // erc20Contract: ERC20,
  // zAuctionContract: Zauction
): Promise<VerifyBidResponse> {
  // Instantiate contracts
  const erc20Contract = await getTokenContract();
  const zAuctionContract: Zauction = await getZAuctionContract();

  // Calculate user balance, block number, and the signing account
  const userBalance = await erc20Contract.balanceOf(params.account);
  const bidAmount = ethers.BigNumber.from(params.bidAmount);

  const ethersProvider = getEthersProvider();
  const blockNum = ethers.BigNumber.from(await ethersProvider.getBlockNumber());
  const start = ethers.BigNumber.from(params.startBlock);
  const expire = ethers.BigNumber.from(params.expireBlock);

  const recoveredAccount = await calculateSigningAccount(
    params,
    signedMessage,
    zAuctionContract
  );

  // Perform necessary checks to verify a bid
  const conditions = [
    {
      condition: userBalance.lt(bidAmount),
      message: "Bidder has insufficient balance",
    },
    {
      condition: blockNum.lt(start),
      message: "Current block is less than start block",
    },
    {
      condition: blockNum.gt(expire),
      message: "Current block is equal to or greater than expire block",
    },
    {
      condition: recoveredAccount != params.account,
      message: "Account sent and account recovered from signature do not match",
    },
  ];

  conditions.forEach((check) => {
    if (check.condition)
      return {
        pass: false,
        status: 405,
        message: check.message,
      } as VerifyBidResponse;
  });

  // If nothing is wrong, proceed with bid
  return {
    pass: true,
    status: 200,
    message: "",
  } as VerifyBidResponse;
}

export async function getOrCreateAuction(
  newBid: Bid,
  auctionFile: SafeDownloadedFile
): Promise<Auction> {
  let auction: Maybe<Auction>;

  if (auctionFile.exists) {
    auction = JSON.parse(auctionFile.data) as Auction;
  } else {
    auction = {
      tokenId: newBid.tokenId,
      contractAddress: newBid.contractAddress,
      bids: [],
    } as Auction;
  }

  return auction;
}
