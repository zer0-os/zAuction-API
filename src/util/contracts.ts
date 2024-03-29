import { ethers } from "ethers";
import * as env from "env-var";

import {
  ERC20,
  ERC20__factory,
  Zauction,
  Zauction__factory,
} from "../types/contracts";

export function getEthersProvider(): ethers.providers.JsonRpcProvider {
  const infuraUrl = env.get("INFURA_URL").required().asString();
  if (!infuraUrl) throw ReferenceError;
  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  return provider as ethers.providers.JsonRpcProvider;
}

export async function getZAuctionContract(): Promise<Zauction> {
  // Contract setup
  const zAuctionAddress = env.get("ZAUCTION_ADDRESS").required().asString();
  if (!zAuctionAddress) throw ReferenceError;
  const provider = getEthersProvider();
  const contract = Zauction__factory.connect(zAuctionAddress, provider);
  return contract;
}

let tokenAddressCache: string | undefined;
export async function getTokenContract(tokenId: string): Promise<ERC20> {
  if (tokenAddressCache) {
    const provider = getEthersProvider();
    const contract = ERC20__factory.connect(tokenAddressCache, provider);
    return contract;
  }

  const zAuction = await getZAuctionContract();
  tokenAddressCache = await zAuction.getPaymentTokenForDomain(tokenId);

  return getTokenContract(tokenId);
}

export const getPaymentTokenForDomain = async (
  tokenId: string
): Promise<string> => {
  const contract = await getZAuctionContract();
  const paymentToken = await contract.getPaymentTokenForDomain(tokenId);
  return paymentToken;
};

export const encodeBid = async (
  bidNonce: string | number,
  bidAmount: string,
  tokenId: string,
  minimumBid: string,
  startBlock: string,
  expireBlock: string,
  contractAddress: string
): Promise<string> => {
  const zAuction = await getZAuctionContract();

  const payload = await zAuction.createBid(
    bidNonce,
    bidAmount,
    contractAddress,
    tokenId,
    minimumBid,
    startBlock,
    expireBlock
  );

  return payload;
};

export const encodeBidV2 = async (
  bidNonce: string | number,
  bidAmount: string,
  tokenId: string,
  minimumBid: string,
  startBlock: string,
  expireBlock: string,
  bidToken: string
): Promise<string> => {
  const zAuction = await getZAuctionContract();

  const payload = await zAuction.createBidV2(
    bidNonce,
    bidAmount,
    tokenId,
    minimumBid,
    startBlock,
    expireBlock,
    bidToken
  );

  return payload;
};
