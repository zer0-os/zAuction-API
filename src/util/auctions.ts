import { ethers } from "ethers";
import { StorageService } from "../storage";
import { ERC20, Zauction } from "../types/contracts"
import { Auction, Bid, BidPostDto } from "../types";
import { ethersProvider, encodeBid } from "./contracts";

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
  
export async function verifyEncodedBid(dto: BidPostDto, erc20Contract: ERC20, zAuctionContract: Zauction) {
  // Check account balance
  const userBalance = await erc20Contract.balanceOf(dto.account);
  const bidAmount = ethers.BigNumber.from(dto.bidAmount);

  // Check start block/expire block
  const blockNum = ethers.BigNumber.from(
    await ethersProvider.getBlockNumber()
  );
  const start = ethers.BigNumber.from(dto.startBlock);
  const expire = ethers.BigNumber.from(dto.expireBlock);

  // Check signature recovers correct account
  const bidMessage = await encodeBid(
    dto.auctionId,
    dto.bidAmount,
    dto.contractAddress,
    dto.tokenId,
    dto.minimumBid,
    dto.startBlock,
    dto.expireBlock
  );

  const unsignedMessage = await zAuctionContract.toEthSignedMessageHash(
    bidMessage
  );
  const recoveredAccount = await zAuctionContract.recover(
    unsignedMessage,
    dto.signedMessage
  );

  let conditions = [
    {
      condition: userBalance.lt(bidAmount),
      message: "Bidder has insufficient balance"
    },
    {
      condition: blockNum.lt(start),
      message: "Current block is less than start block"
    },
    {
      condition: blockNum.gt(expire),
      message: "Current block is equal to or greater than expire block"
    },
    {
      condition: recoveredAccount != dto.account,
      message: "Account sent and account recovered from signature do not match"
    }
  ]

  conditions.forEach( (check) => {
    if(check.condition) return {
      verify: false,
      status: 405,
      message: check.message
    }
  })

  // If nothing is wrong, proceed with bid
  return {
    verify: true,
    status: 200,
    message: ""
  }
}