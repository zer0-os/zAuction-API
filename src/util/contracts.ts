import * as env from "env-var";
import { ethers } from "ethers";

import {
  ERC20,
  ERC20__factory,
  Zauction,
  Zauction__factory,
} from "types/contracts";

// Ethers/Infura
const infuraUrl = env.get("INFURA_URL").required().asString();
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);
const signer = new ethers.VoidSigner(ethers.constants.AddressZero, provider);

// Contract setup
const zAuctionAddress = env.get("ZAUCTION_ADDRESS").required().asString();

export async function getZAuctionContract(): Promise<Zauction> {
  const contract = Zauction__factory.connect(zAuctionAddress, signer);
  return contract;
}

let tokenAddressCache: string | undefined;
export async function getTokenContract(): Promise<ERC20> {
  if (tokenAddressCache) {
    const contract = ERC20__factory.connect(tokenAddressCache, signer);
    return contract;
  }

  const zAuction = await getZAuctionContract();
  tokenAddressCache = await zAuction.token();

  return getTokenContract();
}

export const ethersProvider = provider;

export async function encodeBid(
  auctionId: string | number,
  bidAmount: string,
  contractAddress: string,
  tokenId: string,
  minimumBid: string,
  startBlock: string,
  expireBlock: string
): Promise<string> {
  const zAuction = await getZAuctionContract();

  const payload = await zAuction.createBid(
    auctionId,
    bidAmount,
    contractAddress,
    tokenId,
    minimumBid,
    startBlock,
    expireBlock
  );

  return payload;
}
