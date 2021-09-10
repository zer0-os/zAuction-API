import { ethers } from "ethers";
import { Document } from "mongodb";
import {
  SafeDownloadedFile,
  StorageService,
  MongoStorageService,
} from "../storage";
import { Zauction } from "../types/contracts";
import { Auction, Bid, VerifyBidResponse, Maybe, BidParams } from "../types";
import {
  encodeBid,
  getEthersProvider,
  getTokenContract,
  getZAuctionContract,
} from "./contracts";

export async function getBidsForAccount(
  storage: MongoStorageService,
  account: string
): Promise<Bid[]> {
  const dataContents: Document[] = await storage.queryData({
    account: `${account}`,
  });
  return dataContents as Bid[];
}

export async function getBidsForNftFleek(
  storage: StorageService,
  nftId: string
): Promise<Bid[]> {
  try {
    const fileContents = await storage.downloadFile(nftId);
    const auction = JSON.parse(fileContents) as Auction;
    return auction.bids;
  } catch {
    throw Error(`Unable to get bids for NFT ${nftId}`);
  }
}

export async function getBidsForNft(
  storage: MongoStorageService,
  nftId: string
): Promise<Bid[]> {
  try {
    // where is nftid kept? how do we maintain that lookup?
    const dataContents: Document[] = await storage.queryData({
      nftId: `${nftId}`,
    });

    // check cursor.count === 0
    const bids: Bid[] = [];

    await dataContents.forEach((doc) => {
      const bid: Bid = {
        nftId: doc.nftId,
        account: doc.account,
        auctionId: doc.auctionId,
        bidAmount: doc.bidAmount,
        contractAddress: doc.contractAddress,
        tokenId: doc.tokenId,
        minimumBid: doc.minimumBid,
        startBlock: doc.startBlock,
        expireBlock: doc.expireBlock,
        signedMessage: doc.signedMessage,
        date: doc.date,
      };

      bids.push(bid);
    });

    return bids;
  } catch {
    throw Error(`Couldn't retrieve bid information for ${nftId}`);
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
  signedMessage: string
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
