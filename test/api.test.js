const request = require("supertest");
const app = require("../src/app");

describe("API Endpoint Tests", () => {

  describe("/bid Tests", () => {
    it("Fails on invalid input", () => {
      const badPayload = {
        foo: "bar"
      }
      
      request(app)
        .post("/bid")
        .send(badPayload)
        .expect(400)
    }),
    // mock storage with sinon, don't touch fleek
    it("Returns 200 on expected input", () => {
      const payload = {
        nftIds: [
          "0x1234",
          "0x5678"
        ]
      }

      request(app)
        .post("/bid")
        .send(payload)
        .expect(200)
        // expect the bids object not just status?
    })
  });

  describe("/bids/list Tests", () => {
    it("Fails on invalid input", () => {
      const badPayload = {
        foo: "bar"
      }
      
      request(app)
        .post("/bids/list")
        .send(badPayload)
        .expect(400)
    })
  })
});
