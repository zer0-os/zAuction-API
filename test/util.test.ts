// import request from "supertest";
import { assert, expect } from "chai";
import sinon from "sinon";
import env from "dotenv"
env.config()

import { BidParams, VerifyBidResponse } from "../src/types";
import { getTokenContract, getZAuctionContract } from "../src/util";
import { verifyEncodedBid, calculateNftId } from "../src/util/auctions"
import { ERC20 } from "../src/types/contracts";

const utils = require("../src/util")

describe("Utility Function Tests", () => {
  describe("Auctions Utility Tests", () => {
    // All real values for now
    const account = "0xaE3153c9F5883FD2E78031ca2716520748c521dB"
    const auctionId = "20870439378"
    const bidAmount = "13000000000000000000"
    const contractAddress = "0xC613fCc3f81cC2888C5Cccc1620212420FFe4931";
    const tokenId = "0x5be2bbad57b53528f9f2912b6f7f9605e4a061e1efd12a941c64e88c1d295e4f";
    const minimumBid = "0"
    const startBlock = "0"
    const expireBlock = "999999999999"
    const signedMessage = "0x7e209bd68e56b1400dc4989291a20b315a5c86a079cba03b741666a25b9d4fa40ace6a8b2d28e44fc2847c6d8094ba3fb32c2c94aa7a99cbe9d5e3c1be1d36ac1b"

    process.env.INFURA_URL = "a url"

    it("Calculates the NFT ID", (done) => {
      const nftId = calculateNftId(contractAddress, tokenId);
      assert.isString(nftId)
      assert(nftId.length == 66);
      console.log(process.env.INFURA_URL)
      done();
    });

    it("Verifies the encoded bid", async (done) => {
      const params: BidParams = {
        account: account,
        auctionId: auctionId,
        bidAmount: bidAmount,
        contractAddress: contractAddress,
        tokenId: tokenId,
        minimumBid: minimumBid,
        startBlock: startBlock,
        expireBlock: expireBlock,
      };

      // dummy values for now to get it working
      sinon.stub(utils, "getTokenContract").returns(1)
      const erc20Contract = await getTokenContract()
      
      sinon.stub(utils, "getZAuctionContract").returns(2)
      const zAuctionContract = await getZAuctionContract()

      // const verifybidRespone: VerifyBidResponse = verifyEncodedBid(
      //     params,
      //     signedMessage,
      //     erc20Contract,
      //     zAuctionContract
      // );

      done();
    })
  });
});
