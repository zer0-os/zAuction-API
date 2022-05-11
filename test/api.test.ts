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
import * as auctions from "../src/util/auctions";
import * as contracts from "../src/util/contracts";

describe("Test API Endpoints", async () => {
  sinon.stub(contracts, "encodeBid").returns(Promise.resolve("encoded-bid"));
  sinon.stub(contracts, "encodeBidV2").returns(Promise.resolve("encoded-bidv2"));
  sinon.stub(contracts, "getPaymentTokenForDomain").returns(Promise.resolve("0x2"))

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

  describe("POST /bid", () => {
    it("Validates the BidPayload schema correctly for a v2.1 bid", () => {
      const payload: BidPayloadPostDto = {
        bidAmount: "0",
        tokenId: "0x1",
        minimumBid: "0",
        startBlock: "0",
        expireBlock: "1",
        bidToken: "0x2"
      };

      request(App)
        .post("/api/bid")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body.payload);
          assert.isDefined(res.body.bidNonce);
        })
        .expect(200);
    });
    it("Validates the BidPayload schema correctly for a v2.0 bid", async () => {
      const payload: BidPayloadPostDto = {
        bidAmount: "0",
        tokenId: "0x1",
        minimumBid: "0",
        startBlock: "0",
        expireBlock: "1",
        contractAddress: "0x2"
      };

      request(App)
        .post("/api/bid")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body.payload);
          assert.isDefined(res.body.bidNonce);
        })
        .expect(200);
    }),
    it("Fails on incorrect BidPayload schema", (done) => {
      // Intentional missing parameters
      const payload = {
        foo: "bar",
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
        tokenIds: ["0x123"],
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
    it("Validates BidPostDto schema correctly", () => {
      const payload: BidPostDto = {
        account: "0x",
        bidNonce: "0",
        bidAmount: "0",
        tokenId: "0x1",
        contractAddress: "0x1",
        minimumBid: "0",
        startBlock: "0",
        expireBlock: "1",
        signedMessage: "0x",
        bidToken: "0x2"
      };

      request(App)
        .post("/api/bids")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isObject(res.body);
        })
        .expect(200);
    });
    it("Fails on incorrect BidsPostDto schema", (done) => {
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
        tokenId: "0x123",
      };

      request(App)
        .get(`/api/bids/${payload.tokenId}`)
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

  describe("GET /ping", () => {
    it("Returns a success response when a provider connection can be established", (done) => {
      request(App)
        .get(`/api/ping`)
        .set("Content-Type", "application/json")
        .expect(200, done);
    });
  });
});
