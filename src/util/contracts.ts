import { ethers } from "ethers";
import * as env from "env-var";

import {
  ERC20,
  ERC20__factory,
  Zauction,
  Zauction__factory,
} from "../types/contracts";

// Ethers/Infura
function getVoidSigner(): ethers.VoidSigner {
  const provider = getEthersProvider();
  const signer = new ethers.VoidSigner(ethers.constants.AddressZero, provider);

  return signer as ethers.VoidSigner;
}

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
  const signer = getVoidSigner();
  const contract = Zauction__factory.connect(zAuctionAddress, signer);
  return contract;
}

let tokenAddressCache: string | undefined;
export async function getTokenContract(tokenId: string): Promise<ERC20> {
  if (tokenAddressCache) {
    const signer = getVoidSigner();
    const contract = ERC20__factory.connect(tokenAddressCache, signer);
    return contract;
  }

  const zAuction = await getZAuctionContract();
  tokenAddressCache = await zAuction.getPaymentTokenForDomain(tokenId);

  return getTokenContract(tokenId);
}

export const encodeBid = async (
  bidNonce: string | number,
  bidAmount: string,
  tokenId: string,
  minimumBid: string,
  startBlock: string,
  expireBlock: string,
  bidToken: string
): Promise<string> => {
  const zAuction = await getZAuctionContract();

  // Will call internally to `hub.getRegistrarForDomain()` and hash with the contract address
  const payload = await zAuction.createBid(
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
