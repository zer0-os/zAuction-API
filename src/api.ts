import express from "express";
import fleek from "@fleekhq/fleek-storage-js";
import rateLimit from "express-rate-limit";
import Ajv from "ajv";
import { ethers } from "ethers";
import * as env from 'env-var';
//const abi = require("./abi.json");

const router = express.Router();
const ajv = new Ajv();


// Ethers/Infura
//const infuraUrl = process.env.INFURA_URL;
//const contractAddress = process.env.CONTRACT_ADDRESS;
const infuraUrl = env.get('INFURA_URL').required().asString();
//const contractAddress = env.get('CONTRACT_ADDRESS').required().asString();
const prov = new ethers.providers.JsonRpcProvider(infuraUrl);
const signer = prov.getSigner();

//const contract = new ethers.Contract(contractAddress, abi, signer);

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // limit each IP to 50 requests per windowMs
});

// Use .env.example as a basis for a .env file with the correct fleek credentials
const secrets = {
  apiKey: env.get('FLEEK_API_KEY').required().asString(),
  apiSecret: env.get('FLEEK_API_SECRET').required().asString(),
  infuraSecret: env.get('INFURA_API_SECRET').required().asString()
};

// Ajv Schemas
const BidPayloadPostSchema = {
  type: "object",
  properties: {
    bidAmount: {type: "number"},
    nftAddress: {type: "string"},
    tokenId: {type: "string"},
    minBid: {type: "number"},
    startBlock: {type: "string"},
    expireBlock: {type: "string"},
    bidder: {type: "string"},
  },
  required: ["bidAmount", "nftAddress", "tokenId", "minBid", "startBlock", "expireBlock", "bidder"]
}
const validateBidPayloadSchema = ajv.compile(BidPayloadPostSchema);

const BidPostSchema = {
  type: "object",
  properties: {
    bidAmount: {type: "number"},
    nftAddress: {type: "string"},
    tokenId: {type: "string"},
    minBid: {type: "number"},
    startBlock: {type: "string"},
    expireBlock: {type: "string"},
    bidder: {type: "string"},
    auctionId: {type: "string"},
    signedBid: {type: "string"}
  },
  required: ["bidAmount", "nftAddress", "tokenId", "minBid", "startBlock", "expireBlock", "bidder", "auctionId", "signedBid"]
}
const validateBidPostSchema = ajv.compile(BidPostSchema);

// Function to check null and empty encode bid fields
function checkNullEncodeFields(...args: string[]) {
  let encodeFields = [
    "auctionId",
    "zAuctionAddress",
    "chainId",
    "bidAmt",
    "contractAddress",
    "tokenId"
  ];
  for (let i = 0; i < args.length; i++) {
    if (args[i] == null || !/\S/.test(args[i])) {
      return { data: encodeFields[i], value: false };
    }
  }
  return { data: null, value: true };
}

// Function to check null and empty bid request fields
function checkNullBidFields(...args: string[]) {
  let bidFields = ["seller", "account", "tokenId", "contractAddress", "bidAmt", "bidMsg"];
  for (let i = 0; i < args.length; i++) {
    if (args[i] == null || !/\S/.test(args[i])) {
      return { data: bidFields[i], value: false };
    }
  }
  return { data: null, value: true };
}

// Function to check null and empty current bid request fields
function checkNullCurrentBidFields(...args: string[]) {
  let currentBidFields = ["seller", "contractAddress", "tokenId"];
  for (let i = 0; i < args.length; i++) {
    if (args[i] == null || !/\S/.test(args[i])) {
      return { data: currentBidFields[i], value: false };
    }
  }
  return { data: null, value: true };
}

// Returns a encoded data to be signed
router.get("/encodeBid", async (req, res, next) => {
  try {
    let result = checkNullEncodeFields(
      req.body.auctionId,
      req.body.zAuctionAddress,
      req.body.chainId,
      req.body.bidAmt,
      req.body.contractAddress,
      req.body.tokenId
    );
    if (result["value"] == false) {
      return res.status(400).send({ message: result["data"] + " not found" });
    }
    let params = ethers.utils.defaultAbiCoder.encode(['uint256','address','uint8','uint256', 'address', 'uint256', 'uint256','uint256','uint256'],
    [req.body.auctionId, req.body.zAuctionAddress, req.body.chainId, req.body.bidAmt, req.body.contractAddress, req.body.tokenId, '0', '0', '9999999999999']);      
    let signage = ethers.utils.keccak256(params);
    return res.status(200).send(signage);
  } catch (error) {
    next(error);
  }
});

// Creates a new bid for an auction
router.post("/bid", async (req, res, next) => {
  try {
    let result = checkNullBidFields(
      req.body.seller,
      req.body.account, // account of the bidder
      req.body.tokenId,
      req.body.contractAddress,
      req.body.bidAmt,
      req.body.bidMsg // signed msg
    );
    if (result["value"] == false) {
      return res.status(400).send({ message: result["data"] + " not found" });
    }
    // generate auctionId
    let idString = req.body.contractAddress + req.body.tokenId + req.body.seller;
    let idStringBytes = ethers.utils.toUtf8Bytes(idString);
    let auctionId = ethers.utils.keccak256(idStringBytes);
    //console.log("New auctionId is", auctionId);
    // pull auction from fleek with given auctionId
    await fleek
      .get({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        key: auctionId,
      })
      .then(async (auction) => {
        // then parse data & add currentBidder and currentBid
        if (auction.data) {
          let oldAuction = JSON.parse(auction.data);
          const data = {
            seller: oldAuction.seller,
            account: oldAuction.account,
            tokenId: oldAuction.tokenId,
            contractAddress: oldAuction.contractAddress,
            currentBidder: req.body.account,
            currentBid: req.body.bidAmt,
            bidMsg: req.body.bidMsg,
          };
          // if the new bid amount is greater than the old bid amount
          if (req.body.bidAmt > oldAuction.bidAmt) {
            // delete the old auction
            await fleek
              .deleteFile({
                apiKey: secrets.apiKey,
                apiSecret: secrets.apiSecret,
                key: auctionId,
              })
              .then(async () => {
                // and upload new auction under the same name (key)
                await fleek
                  .upload({
                    apiKey: secrets.apiKey,
                    apiSecret: secrets.apiSecret,
                    key: auctionId,
                    data: JSON.stringify(data),
                  })
                  .then(() => res.status(200).send({ message: "Ok" }));
              });

          } else {
            res.status(405).send({ message: "New bid amount must be greater than current bid amount"});
          }
        } else {
          const data = {
            seller: req.body.seller,
            account: req.body.account,
            tokenId: req.body.tokenId,
            contractAddress: req.body.contractAddress,
            currentBidder: req.body.account,
            currentBid: req.body.bidMsg,
          };
          await fleek
                .upload({
                  apiKey: secrets.apiKey,
                  apiSecret: secrets.apiSecret,
                  key: auctionId,
                  data: JSON.stringify(data),
                })
                .then(() => res.status(200).send({ message: "Ok" }));
        }
      });
  } catch (error) {
    next(error);
  }
});

// Endpoint to return current highest bid given seller, contract address, and tokenid
router.get("/currentBid", limiter, async (req, res, next) => {
  try {
    let result = checkNullCurrentBidFields(
      req.body.seller,
      req.body.contractAddress,
      req.body.tokenId
    );
    if (result["value"] == false) {
      return res.status(400).send({ message: result["data"] + " not found" });
    }
    // generate auctionId
    let idString = req.body.contractAddress + req.body.tokenId + req.body.seller;
    let idStringBytes = ethers.utils.toUtf8Bytes(idString);
    let auctionId = ethers.utils.keccak256(idStringBytes);
    // get file with key from fleek
    await fleek
      .get({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        key: auctionId,
      })
      .then((file) => {
        // parse file and return only bids
        let auction = JSON.parse(file.data);
        console.log(auction);
        let bids = {
          currentBidder: auction.currentBidder,
          currentBid: auction.currentBid
        };
        res.json(bids);
      });
  } catch (error) {
    next(error);
  }
});

export = router;
