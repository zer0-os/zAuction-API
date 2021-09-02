// import request from "supertest";
import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
import App from "../src/app";
import * as contracts from "../src/util/contracts";

describe("Cont", () => {
  describe("POST /bid", () => {
    it("Validates the BidPayload schema correctly", (done) => {
      const payload = {
        bidAmount: "0",
        contractAddress: "0x1",
        tokenId: "0x1",
        minimumBid: "0",
        startBlock: "0",
        expireBlock: "1",
      };

      sinon.stub(contracts, "encodeBid").returns(Promise.resolve(""));

      request(App)
        .post("/api/bid")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(200, done);
    });
    it("Calculates the NFT ID", (done) => {
      done();
    });
    // mock storage with sinon, don't touch fleek
    // it("Returns 200 on expected input", (done) => {
    //   const payload = {
    //     "bidAmount": "0",
    //     // Have to use real contract address or checksum will fail
    //     "contractAddress": "0xC613fCc3f81cC2888C5Cccc1620212420FFe4931", // 500 with invalid address
    //     "tokenId": "0x1",
    //     "minimumBid": "0",
    //     "startBlock": "0",
    //     "expireBlock": "1"
    //   }

    //   request(App)
    //     .post("/api/bid")
    //     .set("Content-Type", "application/json")
    //     .send(payload)
    //     .expect(200)
    //     .end((err) => {
    //       console.log("api.test.ts: " + process.env.INFURA_URL)
    //       // 404 error if not real NFT IDs, shouldn't care though
    //       if (err) return done(err)
    //       return done();
    //     });
    // });

    // it("Fails on incorrect input", (done) => {
    //   const badPayload = {
    //     foo: "bar",
    //   };

    //   request(App)
    //     .post("/bid")
    //     .send(badPayload)
    //     .expect(404)
    //     .end((err) => {
    //       if (err) {
    //         done(err);
    //       } else {
    //         done();
    //       }
    //     });
    // });
  });
});
