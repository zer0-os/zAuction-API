import express from "express";
import fleek from "@fleekhq/fleek-storage-js";
import rateLimit from "express-rate-limit";
import Ajv, { JSONSchemaType } from "ajv";
import { ethers } from "ethers";
import * as env from "env-var";
//const abi = require("./abi.json");

const router = express.Router();
const ajv = new Ajv({ coerceTypes: true });

// Ethers/Infura
//const infuraUrl = process.env.INFURA_URL;
//const contractAddress = process.env.CONTRACT_ADDRESS;
const infuraUrl = env.get("INFURA_URL").required().asString();
//const contractAddress = env.get('CONTRACT_ADDRESS').required().asString();
const prov = new ethers.providers.JsonRpcProvider(infuraUrl);
const signer = prov.getSigner();

//const contract = new ethers.Contract(contractAddress, abi, signer);

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 50 requests per windowMs
});

// Use .env.example as a basis for a .env file with the correct fleek credentials
const secrets = {
  apiKey: env.get("FLEEK_API_KEY").required().asString(),
  apiSecret: env.get("FLEEK_API_SECRET").required().asString(),
  infuraSecret: env.get("INFURA_API_SECRET").required().asString(),
};

// Ajv Schemas
interface BidPayloadPostInterface {
  auctionId: number;
  zAuctionAddress: string;
  chainId: number;
  bidAmt: number;
  contractAddress: string;
  tokenId: number;
}
const BidPayloadPostSchema: JSONSchemaType<BidPayloadPostInterface> = {
  type: "object",
  properties: {
    auctionId: { type: "integer" },
    zAuctionAddress: { type: "string" },
    chainId: { type: "integer" },
    bidAmt: { type: "integer" },
    contractAddress: { type: "string" },
    tokenId: { type: "integer" },
  },
  required: [
    "auctionId",
    "zAuctionAddress",
    "chainId",
    "bidAmt",
    "contractAddress",
    "tokenId",
  ],
};
const validateBidPayloadSchema = ajv.compile(BidPayloadPostSchema);

interface BidPostInterface {
  seller: string;
  account: string;
  tokenId: number;
  contractAddress: string;
  bidAmt: number;
  bidMsg: string;
}
const BidPostSchema: JSONSchemaType<BidPostInterface> = {
  type: "object",
  properties: {
    seller: { type: "string" },
    account: { type: "string" },
    tokenId: { type: "integer" },
    contractAddress: { type: "string" },
    bidAmt: { type: "integer" },
    bidMsg: { type: "string" },
  },
  required: [
    "seller",
    "account",
    "tokenId",
    "contractAddress",
    "bidAmt",
    "bidMsg",
  ],
};
const validateBidPostSchema = ajv.compile(BidPostSchema);

interface CurrentBidInterface {
  seller: string;
  contractAddress: string;
  tokenId: number;
}
const CurrentBidSchema: JSONSchemaType<CurrentBidInterface> = {
  type: "object",
  properties: {
    seller: { type: "string" },
    contractAddress: { type: "string" },
    tokenId: { type: "integer" },
  },
  required: ["seller", "contractAddress", "tokenId"],
};
const validateCurrentBidSchema = ajv.compile(CurrentBidSchema);

// Returns a encoded data to be signed
router.post("/bid", limiter, async (req, res, next) => {
  try {
    if (validateBidPayloadSchema(req.body)) {
      let params = ethers.utils.defaultAbiCoder.encode(
        [
          "uint256",
          "address",
          "uint8",
          "uint256",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
        ],
        [
          req.body.auctionId,
          req.body.zAuctionAddress,
          req.body.chainId,
          req.body.bidAmt,
          req.body.contractAddress,
          req.body.tokenId,
          req.body.minBid,
          req.body.startBlock,
          req.body.expireBlock
        ]
      );
      // generate auctionid, nftid
      let idString =
        req.body.contractAddress + req.body.tokenId;
      let idStringBytes = ethers.utils.toUtf8Bytes(idString);
      let nftId = ethers.utils.keccak256(idStringBytes);
      let payload = ethers.utils.keccak256(params);
      let auctionId = Math.floor(Math.random() * 42949672960);
      return res.status(200).send({payload, auctionId, nftId});
    } else {
      return res.status(400).send(validateBidPayloadSchema.errors);
    }
  } catch (error) {
    next(error);
  }
});

// Creates a new bid for an auction
router.post("/bids/{nft_id}", limiter, async (req, res, next) => {
  try {
    if (validateBidPostSchema(req.body)) {
      
      //estimate gas of bid accept tx - return if infinite/error
      let est = prov.estimateGas.acceptBid(
          req.body.bidMsg, 
          req.body.auctionId,
          req.body.account,
          req.body.bidAmt,
          req.body.tokenId,
          req.body.minBid,
          req.body.startBlock,
          req.body.expireBlock
        );
      if(!est){return;}
      // try to pull auction from fleek with given auctionId
      try {
        let auction = await fleek
          .get({
            apiKey: secrets.apiKey,
            apiSecret: secrets.apiSecret,
            key: req.body.auctionId,
          });
          // then parse data & add currentBidder and currentBid
          let oldAuction = JSON.parse(auction.data);
          // if the new bid amount is greater than the highest bid amount
          if (
            req.body.bidAmt >
            oldAuction.bids[oldAuction.bids.length - 1].bidAmt
          ) {
            const newBid = {
              bidder: req.body.account,
              bidAmt: req.body.bidAmt,
            };
            // place the new bid object at the end of the array
            oldAuction.bids.push(newBid);
            const data = {
              seller: oldAuction.seller,
              account: oldAuction.account,
              tokenId: oldAuction.tokenId,
              contractAddress: oldAuction.contractAddress,
              bids: oldAuction.bids,
              bidMsg: req.body.bidMsg,
            };
            // delete the old auction
            await fleek
              .deleteFile({
                apiKey: secrets.apiKey,
                apiSecret: secrets.apiSecret,
                key: req.body.auctionId,
              });
              // and upload new auction under the same name (key)
              await fleek
                .upload({
                  apiKey: secrets.apiKey,
                  apiSecret: secrets.apiSecret,
                  key: req.body.auctionId,
                  data: JSON.stringify(data),
                });
                res.status(200).send({ message: "Ok" });
          } else {
            res.status(405).send({
              message:
                "New bid amount must be greater than current bid amount",
            });
          }
      } catch (error) {
        // no file was found for auctionId, create a new one.
        const data = {
          seller: req.body.seller,
          account: req.body.account,
          tokenId: req.body.tokenId,
          contractAddress: req.body.contractAddress,
          bids: [
            {
              bidder: req.body.seller,
              bidAmt: req.body.bidAmt,
            },
          ],
          bidMsg: req.body.bidMsg,
        };
        await fleek
          .upload({
            apiKey: secrets.apiKey,
            apiSecret: secrets.apiSecret,
            key: req.body.auctionId,
            data: JSON.stringify(data),
          })
          res.status(200).send({ message: "Ok" })
        next(error);
      }
    } else {
      return res.status(400).send(validateBidPostSchema.errors);
    }
  } catch (error) {
    next(error);
  }
});

// Endpoint to return current highest bid given seller, contract address, and tokenid
router.get("/bids/{nft_id}", limiter, async (req, res, next) => {
  try {
    if (validateCurrentBidSchema(req.body)) {
      // get file with key from fleek
      let file = await fleek
        .get({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: nft_id,
        });
        // parse file and return list of bids
        let auction = JSON.parse(file.data);
        res.json(auction.bids);
    } else {
      return res.status(400).send(validateCurrentBidSchema.errors);
    }
  } catch (error) {
    next(error);
  }
});

export = router;
