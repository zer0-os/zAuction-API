// import request from "supertest";
import { assert, expect } from "chai";
import { calculateNftId } from "../src/util/auctions"

describe("Utility Function Tests", () => {
  describe("Auctions Utility Tests", () => {
    const contractAddress = "0xC613fCc3f81cC2888C5Cccc1620212420FFe4931";
    const tokenId = "0x5be2bbad57b53528f9f2912b6f7f9605e4a061e1efd12a941c64e88c1d295e4f";
    process.env.INFURA_URL = "a url"

    it("Calculates the NFT ID", (done) => {
      const nftId = calculateNftId(contractAddress, tokenId);
      assert.isString(nftId)
      assert(nftId.length == 66);
      done();
    });
  });
});
