import { assert } from "chai";
import env from "dotenv";
env.config();

import { calculateNftId } from "../src/util/auctions";

const utils = require("../src/util");

describe("Utility Function Tests", () => {
  describe("Auctions Utility Tests", () => {
    it("Calculates the NFT ID", (done) => {
      const contractAddress = "0x123";
      const tokenId = "0x456";

      const nftId = calculateNftId(contractAddress, tokenId);
      assert.isString(nftId);
      assert(nftId.length == 66);
      done();
    });
  });
});
