import express from "express";
import fleek from "@fleekhq/fleek-storage-js";
import rateLimit from "express-rate-limit";
import { ethers } from "ethers";
import * as env from "env-var";
import * as zauction from "./contract/Zauction.json";
const router = express.Router();

// Ajv validation methods
import { validateBidPayloadSchema, validateBidPostSchema } from "./schemas";

// Ethers/Infura
//const infuraSecret = env.get("INFURA_API_SECRET").required().asString();
const infuraUrl = env.get("INFURA_URL").required().asString();
const privateKey = env.get("PRIVATE_KEY").required().asString();
//console.log("Infura secret is:",infuraSecret);
//console.log("Infura URL is:",infuraUrl);
//console.log("Private Key is:",privateKey);
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);
const signer = new ethers.Wallet(privateKey, provider); // wallet inherits signer
signer.connect(provider);
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

// Returns encoded data to be signed, an random auction id,
//  and an nft id determined by nft contract address and token id
router.post("/bid", limiter, async (req, res, next) => {
  try {
    // generate auctionid, nftid
    const idString = req.body.contractAddress + req.body.tokenId;
    const idStringBytes = ethers.utils.toUtf8Bytes(idString);
    const nftId = ethers.utils.keccak256(idStringBytes);
    const auctionId = Math.floor(Math.random() * 42949672960);
    if (validateBidPayloadSchema(req.body)) {
      const params = ethers.utils.defaultAbiCoder.encode(
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
          req.body.bidAmount,
          req.body.contractAddress,
          req.body.tokenId,
          req.body.minimumBid,
          req.body.startBlock,
          req.body.expireBlock,
        ]
      );
      const payload = ethers.utils.keccak256(params);
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
      const bal = await provider.getBalance(req.body.account);
      const bigBal = ethers.BigNumber.from(bal);
      const bidAmount = ethers.BigNumber.from(req.body.bidAmount);
      console.log("Bal:", bal);
      if (bigBal.eq(bidAmount)) {
        return res
          .status(405)
          .send({ message: "Bidder has insufficient balance" });
      }

      //check start block/expire block
      const blockNum = await provider.getBlockNumber();
      const bigBlockNum = ethers.BigNumber.from(blockNum);
      const start = ethers.BigNumber.from(req.body.startBlock);
      const expire = ethers.BigNumber.from(req.body.expireBlock);
      console.log("Block Number:", blockNum);
      if (bigBlockNum.eq(start)) {
        return res
          .status(405)
          .send({ message: "Current block is less than start block" });
      }
      if (bigBlockNum.eq(expire)) {
        return res.status(405).send({
          message: "Current block is equal to or greater than expire block",
        });
      }

      //check if auctionid is consumed already
      const alreadyConsumed = await zAuctionContract.consumed(
        req.body.account,
        req.body.auctionId
      );
      console.log("Already Consumed?:", alreadyConsumed);
      if (alreadyConsumed) {
        return res.status(405).send({
          message: "This account has already consumed this auction id",
        });
      }

      //check signature recovers correct account
      const params = ethers.utils.defaultAbiCoder.encode(
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
          zauction.address,
          42, // chainId 42 is kovan
          req.body.bidAmount,
          req.body.contractAddress,
          req.body.tokenId,
          req.body.minimumBid,
          req.body.startBlock,
          req.body.expireBlock,
        ]
      );
      const bidMessage = ethers.utils.keccak256(params);
      const recoveredAccount = await zAuctionContract.recover(
        bidMessage,
        req.body.signedMessage
      );
      //console.log("Recovered Account:",recoveredAccount);
      if (recoveredAccount != req.body.account) {
        return res.status(405).send({
          message:
            "Account sent and account recovered from signature do not match",
        });
      }

      try {
        //estimate gas of bid accept tx - return if infinite/error
        await zAuctionContract.estimateGas.acceptBid(
          req.body.signedMessage,
          req.body.auctionId,
          req.body.account,
          req.body.bidAmount,
          req.body.contractAddress,
          req.body.tokenId,
          req.body.minimumBid,
          req.body.startBlock,
          req.body.expireBlock
        );
      } catch (error) {
        return res.status(405).send({
          message: error,
        });
      }
      // try to pull auction from fleek with given auctionId
      try {
        const auction = await fleek.get({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.nftId,
        });
        // then parse data & add bid data
        let oldAuction = JSON.parse(auction.data);
        // compile the new bid information
        const newBid = {
          signedMessage: req.body.signedMessage,
          auctionId: req.body.auctionId,
          bidder: req.body.account,
          bidAmount: req.body.bidAmount,
          minimumBid: req.body.minimumBid,
          startBlock: req.body.startBlock,
          expireBlock: req.body.expireBlock,
        };
        // place the new bid object at the end of the array
        oldAuction.bids.push(newBid);
        const data = {
          account: oldAuction.account,
          tokenId: oldAuction.tokenId,
          contractAddress: oldAuction.contractAddress,
          bids: oldAuction.bids
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
      } catch (error) {
        // no file was found for nftId, create a new one.
        const data = {
          tokenId: req.body.tokenId,
          contractAddress: req.body.contractAddress,
          bids: [
            {
              account: req.body.account,
              signedMessage: req.body.signedMessage,
              auctionId: req.body.auctionId,
              bidAmount: req.body.bidAmount,
              minimumBid: req.body.minimumBid,
              startBlock: req.body.startBlock,
              expireBlock: req.body.expireBlock,
            },
          ]
        };
        // upload to fleek for nftid sort
        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.nftId,
          data: JSON.stringify(data)
        });
      }
      //store bid by user
      const userBid = {
        signedMessage: req.body.signedMessage,
        auctionId: req.body.auctionId,
        bidAmount: req.body.bidAmount,
        contractAddress: req.body.contractAddress,
        tokenId: req.body.tokenId,
        minimumBid: req.body.minimumBid,
        startBlock: req.body.startBlock,
        expireBlock: req.body.expireBlock,
      }
      try{
        let oldBids = await fleek.get({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.account,
        });
        let bids = JSON.parse(oldBids.data);
        bids.push(userBid);
         // delete the old auction
         await fleek.deleteFile({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.account,
        });
        // upload to fleek for user sort
        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.account,
          data: JSON.stringify(bids)
        });
        return res.status(200).send({ message: "Ok" });
      } catch (error) {
        // upload to fleek for user sort
        const firstBid = [];
        firstBid.push(userBid);
        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.account,
          data: JSON.stringify(firstBid)
        });
        return res.status(200).send({ message: "Ok" });
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
    const file = await fleek.get({
      apiKey: secrets.apiKey,
      apiSecret: secrets.apiSecret,
      key: req.params.nftId,
    });
    // parse file and return list of bids
    const auction = JSON.parse(file.data);
    res.json(auction.bids);
  } catch (error) {
    res.json([]);
  }
});

// Endpoint to return current highest bid given nftId
router.get("/bids/:account", limiter, async (req, res, next) => {
  try {
    // get file with key from fleek
    const file = await fleek.get({
      apiKey: secrets.apiKey,
      apiSecret: secrets.apiSecret,
      key: req.params.account,
    });
    // parse file and return list of bids
    const auction = JSON.parse(file.data);
    res.json(auction.bids);
  } catch (error) {
    res.json([]);
  }
});

export = router;
