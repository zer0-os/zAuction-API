// import request from "supertest";
import { expect, assert } from "chai";
import sinon from "sinon";
import request from "supertest";
import App from "../src/app";
import { adapters, StorageService } from "../src/storage";
import * as util from "../src/util"
import * as auctions from "../src/util/auctions"
import * as contracts from "../src/util/contracts";

describe("Test API Endpoints", () => {  
  describe("POST /bid", () => {
    beforeEach(() => {
      sinon.stub(contracts, "encodeBid").returns(Promise.resolve(""));
    });
    afterEach(() => {
      sinon.restore()
    });
    it("Validates the BidPayload schema correctly", (done) => {
      const payload = {
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
          assert.isDefined(res.body.payload)
          assert.isDefined(res.body.auctionId)
          assert.isDefined(res.body.nftId)
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
    before(() => {
      sinon.stub(adapters.fleek, "create").returns(Promise.resolve({}) as unknown as StorageService);
      sinon.stub(util, "getFleekConnection").returns(Promise.resolve({}) as unknown as StorageService);
    });
    after(() => {
      sinon.restore();
    });
    it("Validates the BidsListPost schema correctly", (done) => {
      const payload = {
        nftIds: [
          "0x123"
        ]
      }

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
        foo: "bar"
      }

      request(App)
        .post("/api/bids/list")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(400, done);
    });
  });

  describe("GET /bids/account/:account", () => {
    before(() => {
      const stubbedStorageService = {
        downloadFile: () => {}
      }
      sinon.stub(adapters.fleek, "create").returns(Promise.resolve(stubbedStorageService) as unknown as StorageService);
      sinon.stub(util, "getFleekConnection").returns(Promise.resolve(stubbedStorageService) as unknown as StorageService);
    });
    after(() => {
        sinon.restore();
    });
    it("Validates the BidsAccountGet schema correctly", (done) => {
      const payload = "0x123"

      request(App)
        .get(`/api/bids/accounts/${payload}`)
        .set("Content-Type", "application/json")
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isArray(res.body);
        })
        .expect(200, done);
    });
    it("Returns and empty array when no account is given", (done) => {
      const payload = ""

      request(App)
        .get(`/api/bids/accounts/${payload}`)
        .set("Content-Type", "application/json")
        .send(payload)
        .expect((res) => {
          assert.isDefined(res.body);
          assert.isArray(res.body);
          assert.isEmpty(res.body);
        })
        .expect(200, done);
    });
  });
});
