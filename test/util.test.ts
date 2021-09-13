import { assert } from "chai";
import env from "dotenv";
import sinon from "sinon";

import * as auctions from "../src/util";
import { calculateNftId } from "../src/util/auctions";

env.config();

const utils = require("../src/util");

describe("Utility Function Tests", () => {
  sinon.stub(auctions, "calculateNftId").returns("0x1");
  
  describe("Auctions Utility Tests", () => {
    it("Calculates the NFT ID", (done) => {
      const contractAddress = "0x123";
      const tokenId = "0x456";

      const nftId = calculateNftId(contractAddress, tokenId);

      assert.isString(nftId);
      assert(nftId.length === 3);
      done();
    });
  });
});
