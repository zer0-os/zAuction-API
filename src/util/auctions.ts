import { ethers } from "ethers";

import { Zauction } from "../types/contracts";
import { VerifyBidResponse, BidParams } from "../types";
import {
  encodeBid,
  encodeBidV2,
  getEthersProvider,
  getTokenContract,
  getZAuctionContract,
} from "./contracts";

async function calculateSigningAccount(
  bidData: BidParams,
  signedMessage: string,
  zAuctionContract: Zauction
): Promise<string> {
  // Check signature recovers correct account
  let bidMessage;
  // bidToken means bid is v2.1
  if (bidData.bidToken) {
    bidMessage = await encodeBidV2(
      bidData.bidNonce,
      bidData.bidAmount,
      bidData.tokenId,
      bidData.minimumBid,
      bidData.startBlock,
      bidData.expireBlock,
      bidData.bidToken
    );
  } else if (bidData.contractAddress) {
    // Otherwise a bid is v2.0
    // We know with certainty that a contract address is present.
    // it would have failed in encoding without a contract address as a v2.0 bid
    bidMessage = await encodeBid(
      bidData.bidNonce,
      bidData.bidAmount,
      bidData.tokenId,
      bidData.minimumBid,
      bidData.startBlock,
      bidData.expireBlock,
      bidData.contractAddress
    );
  } else {
    throw new Error(
      `Received a v2 bid but no contract address ('contractAddress') was present.`
    );
  }

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
  // Get the correct ERC20 token for that domain
  const erc20Contract = await getTokenContract(params.tokenId); // will be default as we haven't set wild token network yet
  const zAuctionContract: Zauction = await getZAuctionContract();

  // Calculate user balance, block number, and the signing account
  const userBalance = await erc20Contract.balanceOf(params.account);
  const bidAmount = ethers.BigNumber.from(params.bidAmount);

  const ethersProvider = getEthersProvider();
  const blockNum = ethers.BigNumber.from(await ethersProvider.getBlockNumber());
  const start = ethers.BigNumber.from(params.startBlock);
  const expire = ethers.BigNumber.from(params.expireBlock);

  let recoveredAccount;
  try {
    recoveredAccount = await calculateSigningAccount(
      params,
      signedMessage,
      zAuctionContract
    );
  } catch (e) {
    return {
      pass: false,
      status: 400,
      message: e,
    } as VerifyBidResponse;
  }

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
      message:
        "Bid was signed wrong by wallet. This may be due to your wallet software being out of date. If this problem persists try a different wallet.",
    },
  ];

  for (const check of conditions) {
    if (check.condition)
      return {
        pass: false,
        status: 405,
        message: check.message,
      } as VerifyBidResponse;
  }

  // If nothing is wrong, proceed with bid
  return {
    pass: true,
    status: 200,
    message: "",
  } as VerifyBidResponse;
}
