// import request from "supertest";
import { assert } from "chai";
import sinon from "sinon";
import request from "supertest";
import App from "../src/app";
import { adapters, BidDatabaseService } from "../src/database";
import {
  BidPayloadPostDto,
  BidsAccountsDto,
  BidsListDto,
  BidPostDto,
  BidsDto,
} from "../src/types";
import * as util from "../src/util";
import * as auctions from "../src/util/auctions";
import * as contracts from "../src/util/contracts";

describe("Test API Endpoints", async () => {
  sinon.stub(contracts, "encodeBid").returns(Promise.resolve(""));

  const stubbedDatabaseService = {
    insertBid: () => {},
    getBidsByNftId: () => {},
    getBidsByAccount: () => {},
  };

  sinon
    .stub(adapters.mongo, "create")
    .returns(
      (await Promise.resolve(
        stubbedDatabaseService
      )) as unknown as BidDatabaseService
    );

  const stubbedVerifyBidResponse = {
    pass: true,
    status: 200,
    message: "OK",
  };
  sinon
    .stub(auctions, "verifyEncodedBid")
    .returns(Promise.resolve(stubbedVerifyBidResponse));

  sinon.stub(auctions, "calculateNftId").returns("0x1");

  describe("POST /bid", () => {
    it("Validates the BidPayload schema correctly", (done) => {
      const payload: BidPayloadPostDto = {
        bidAmount: "0",
        contractAddress: "0x1",
        tokenId: "0x1",
        minimumBid: "0",
        startBlock: "0",
        expireBlock: "1",
      };

      request(App)
        .post("/api/bid")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body.payload);
          assert.isDefined(res.body.auctionId);
          assert.isDefined(res.body.nftId);
        })
        .expect(200, done);
    });
    it("Fails on incorrect BidPayload schema", (done) => {
      const payload = {
        foo: "bar",
        // Intentional missing parameters
      };

      request(App)
        .post("/api/bid")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(400, done);
    });
  });

  describe("POST /bids/list", () => {
    it("Validates the BidsListPost schema correctly", (done) => {
      const payload: BidsListDto = {
        nftIds: ["0x123"],
      };

      request(App)
        .post("/api/bids/list")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isObject(res.body);
          // Requires at least one nftId is given
          // so always returns at least one as well
          assert.isTrue("0x123" in res.body);
        })
        .expect(200, done);
    });
    it("Fails on incorrect BidsListPost schema", (done) => {
      const payload = {
        foo: "bar",
      };

      request(App)
        .post("/api/bids/list")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(400, done);
    });
  });

  describe("GET /bids/account/:account", () => {
    it("Validates the BidsAccountGet schema correctly", (done) => {
      const payload: BidsAccountsDto = {
        account: "0x123",
      };

      request(App)
        .get(`/api/bids/accounts/${payload.account}`)
        .set("Content-Type", "application/json")
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isArray(res.body);
        })
        .expect(200, done);
    });
    it("Returns an empty array when account is not found", (done) => {
      const payload: BidsAccountsDto = {
        account: "0x123",
      };

      request(App)
        .get(`/api/bids/accounts/${payload.account}`)
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isArray(res.body);
        })
        .expect(200, done);
    });
  });

  describe("POST /bids", () => {
    it("Validates BidPost schema correctly", (done) => {
      const payload: BidPostDto = {
        account: "0x",
        auctionId: "0",
        bidAmount: "0",
        tokenId: "0x1",
        contractAddress: "0x1",
        minimumBid: "0",
        startBlock: "0",
        expireBlock: "1",
        signedMessage: "0x",
      };

      request(App)
        .post("/api/bids")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isObject(res.body);
        })
        .expect(200, done);
    });
    it("Fails on incorrect BidsListPost schema", (done) => {
      const payload = {
        account: "0x",
      };

      request(App)
        .post("/api/bids")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(400, done);
    });
  });

  describe("GET /bids/:nftId", () => {
    it("Validates the BidsGet schema correctly", (done) => {
      const payload: BidsDto = {
        nftId: "0x123",
      };

      request(App)
        .get(`/api/bids/${payload.nftId}`)
        .set("Content-Type", "application/json")
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isArray(res.body);
        })
        .expect(200, done);
    });
    it("Returns an empty array when no params are given", (done) => {
      const payload = {};

      request(App)
        .get(`/api/bids/${payload}`)
        .set("Content-Type", "application/json")
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isArray(res.body);
          assert.isEmpty(res.body);
        })
        .expect(200, done);
    });
  });
});
