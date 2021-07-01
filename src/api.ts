import express from "express";
import fleek from "@fleekhq/fleek-storage-js";
import rateLimit from "express-rate-limit";
import Ajv, { JSONSchemaType } from "ajv";
import { ethers } from "ethers";
import * as env from "env-var";
import * as zauction from "./contract/Zauction.json";

const router = express.Router();
const ajv = new Ajv({ coerceTypes: true });

// Ethers/Infura
const infuraSecret = env.get("INFURA_API_SECRET").required().asString();
const infuraUrl = env.get("INFURA_URL").required().asString();
const privateKey = env.get("PRIVATE_KEY").required().asString();
//console.log("Infura secret is:",infuraSecret);
//console.log("Infura URL is:",infuraUrl);
//console.log("Private Key is:",privateKey);
const prov = new ethers.providers.JsonRpcProvider(infuraUrl);
const signer = new ethers.Wallet(privateKey, prov); // wallet inherits signer
signer.connect(prov);
//console.log("Address is:",signer.address);
//console.log("Signer is:",signer);

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 50 requests per windowMs
});

// Use .env.example as a basis for a .env file with the correct credentials
const secrets = {
  apiKey: env.get("FLEEK_API_KEY").required().asString(),
  apiSecret: env.get("FLEEK_API_SECRET").required().asString(),
  infuraSecret: env.get("INFURA_API_SECRET").required().asString(),
};

// Ajv Schemas
interface BidPayloadPostInterface {
  bidAmt: number;
  contractAddress: string;
  tokenId: number;
  minBid: number;
  startBlock: number;
  expireBlock: number;
}
const BidPayloadPostSchema: JSONSchemaType<BidPayloadPostInterface> = {
  type: "object",
  properties: {
    bidAmt: { type: "integer" },
    contractAddress: { type: "string" },
    tokenId: { type: "integer" },
    minBid: { type: "integer" },
    startBlock: { type: "integer" },
    expireBlock: { type: "integer" },
  },
  required: [
    "bidAmt",
    "contractAddress",
    "tokenId",
    "minBid",
    "startBlock",
    "expireBlock",
  ],
};
const validateBidPayloadSchema = ajv.compile(BidPayloadPostSchema);

interface BidPostInterface {
  account: string;
  auctionId: number;
  tokenId: number;
  contractAddress: string;
  bidAmt: number;
  bidMsg: string;
  minBid: number;
  startBlock: number;
  expireBlock: number;
  sig: string;
}
const BidPostSchema: JSONSchemaType<BidPostInterface> = {
  type: "object",
  properties: {
    account: { type: "string" },
    auctionId: { type: "integer" },
    tokenId: { type: "integer" },
    contractAddress: { type: "string" },
    bidAmt: { type: "integer" },
    bidMsg: { type: "string" },
    minBid: { type: "integer" },
    startBlock: { type: "integer" },
    expireBlock: { type: "integer" },
    sig: { type: "string" },
  },
  required: [
    "account",
    "auctionId",
    "tokenId",
    "contractAddress",
    "bidAmt",
    "bidMsg",
    "minBid",
    "startBlock",
    "expireBlock",
    "sig",
  ],
};
const validateBidPostSchema = ajv.compile(BidPostSchema);

interface CurrentBidInterface {
  contractAddress: string;
  tokenId: number;
}
const CurrentBidSchema: JSONSchemaType<CurrentBidInterface> = {
  type: "object",
  properties: {
    contractAddress: { type: "string" },
    tokenId: { type: "integer" },
  },
  required: ["contractAddress", "tokenId"],
};
//const validateCurrentBidSchema = ajv.compile(CurrentBidSchema);

// Returns encoded data to be signed, an random auction id,
//  and an nft id determined by nft contract address and token id
router.post("/bid", limiter, async (req, res, next) => {
  try {
    // generate auctionid, nftid
    let idString = req.body.contractAddress + req.body.tokenId;
    let idStringBytes = ethers.utils.toUtf8Bytes(idString);
    let nftId = ethers.utils.keccak256(idStringBytes);
    let auctionId = Math.floor(Math.random() * 42949672960);
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
          auctionId,
          zauction.address,
          42, // chainId 42 is kovan
          req.body.bidAmt,
          req.body.contractAddress,
          req.body.tokenId,
          req.body.minBid,
          req.body.startBlock,
          req.body.expireBlock,
        ]
      );
      let payload = ethers.utils.keccak256(params);
      return res.status(200).send({ payload, auctionId, nftId });
    } else {
      return res.status(400).send(validateBidPayloadSchema.errors);
    }
  } catch (error) {
    next(error);
  }
});

// Creates a new bid for an auction
router.post("/bids/:nftId", limiter, async (req, res, next) => {
  try {
    // validate input data
    if (validateBidPostSchema(req.body)) {
      //instantiate contract
      const zAuctionContract = new ethers.Contract(
        zauction.address,
        zauction.abi,
        signer
      );
      //check balance
      let bal = (await prov.getBalance(req.body.account)).toNumber();
      console.log("Bal:", bal);
      if (bal <= req.body.bidAmt) {
        res.status(405).send({ message: "Bidder has insufficient balance" });
      }

      //check start block/expire block
      let blockNum = await prov.getBlockNumber();
      console.log("Block Number:", blockNum);
      if (blockNum < req.body.startBlock) {
        res
          .status(405)
          .send({ message: "Current block is less than start block" });
      }
      if (blockNum >= req.body.expireBlock) {
        res
          .status(405)
          .send({
            message: "Current block is equal to or greater than expire block",
          });
      }

      //check if auctionid is consumed already
      let alreadyConsumed = await zAuctionContract.consumed(
        req.body.account,
        req.body.auctionId
      );
      console.log("Already Consumed?:", alreadyConsumed);
      if (alreadyConsumed) {
        res
          .status(405)
          .send({
            message: "This account has already consumed this auction id",
          });
      }

      //check signature recovers correct account
      let recoveredAccount = await zAuctionContract.recover(
        req.body.bidMsg,
        req.body.sig
      );
      //console.log("Recovered Account:",recoveredAccount);
      if (recoveredAccount != req.body.account) {
        res
          .status(405)
          .send({
            message:
              "Account sent and account recovered from signature do not match",
          });
      }

      try {
        //estimate gas of bid accept tx - return if infinite/error
        await zAuctionContract.estimateGas.acceptBid(
          req.body.bidMsg,
          req.body.auctionId,
          req.body.account,
          req.body.bidAmt,
          req.body.contractAddress,
          req.body.tokenId,
          req.body.minBid,
          req.body.startBlock,
          req.body.expireBlock
        );
      } catch (error) {
        res.status(405).send({
          message: error,
        });
      }
      // try to pull auction from fleek with given auctionId
      try {
        let auction = await fleek.get({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.nftId,
        });
        // then parse data & add currentBidder and currentBid
        let oldAuction = JSON.parse(auction.data);
        // if the new bid amount is greater than the highest bid amount
        if (
          req.body.bidAmt > oldAuction.bids[oldAuction.bids.length - 1].bidAmt
        ) {
          const newBid = {
            bidder: req.body.account,
            bidAmt: req.body.minBid,
            bidMsg: req.body.bidMsg,
          };
          // place the new bid object at the end of the array
          oldAuction.bids.push(newBid);
          const data = {
            account: oldAuction.account,
            tokenId: oldAuction.tokenId,
            contractAddress: oldAuction.contractAddress,
            bids: oldAuction.bids,
            startBlock: oldAuction.startBlock,
            expireBlock: oldAuction.expireBlock,
          };
          // delete the old auction
          await fleek.deleteFile({
            apiKey: secrets.apiKey,
            apiSecret: secrets.apiSecret,
            key: req.params.nftId,
          });
          // and upload new auction under the same name (key)
          await fleek.upload({
            apiKey: secrets.apiKey,
            apiSecret: secrets.apiSecret,
            key: req.params.nftId,
            data: JSON.stringify(data),
          });
          res.status(200).send({ message: "Ok" });
        } else {
          res.status(405).send({
            message: "New bid amount must be greater than current bid amount",
          });
        }
      } catch (error) {
        // no file was found for nftId, create a new one.
        const data = {
          account: req.body.account,
          tokenId: req.body.tokenId,
          contractAddress: req.body.contractAddress,
          bids: [
            {
              bidder: req.body.account,
              bidAmt: req.body.bidAmt,
              bidMsg: req.body.bidMsg,
            },
          ],
          startBlock: req.body.startBlock,
          expireBlock: req.body.expireBlock,
        };
        // upload to fleek
        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.nftId,
          data: JSON.stringify(data),
        });
        res.status(200).send({ message: "Ok" });
        next(error);
      }
    } else {
      return res.status(400).send(validateBidPostSchema.errors);
    }
  } catch (error) {
    next(error);
  }
});

// Endpoint to return current highest bid given nftId
router.get("/bids/:nftId", limiter, async (req, res, next) => {
  try {
    // get file with key from fleek
    let file = await fleek.get({
      apiKey: secrets.apiKey,
      apiSecret: secrets.apiSecret,
      key: req.params.nftId,
    });
    // parse file and return list of bids
    let auction = JSON.parse(file.data);
    res.json(auction.bids);
  } catch (error) {
    next(error);
  }
});

export = router;
