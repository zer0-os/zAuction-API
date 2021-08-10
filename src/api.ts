import express from "express";
import fleek from "@fleekhq/fleek-storage-js";
import rateLimit from "express-rate-limit";
import { ethers } from "ethers";
import * as env from "env-var";

// Ajv validation methods
import {
  validateBidPayloadSchema,
  validateBidPostSchema,
  validateBidsListPostSchema,
} from "./schemas";
import {
  encodeBid,
  ethersProvider,
  getTokenContract,
  getZAuctionContract,
} from "./util/contracts";

const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

// Use .env.example as a basis for a .env file with the correct credentials
const secrets = {
  apiKey: env.get("FLEEK_API_KEY").required().asString(),
  apiSecret: env.get("FLEEK_API_SECRET").required().asString(),
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
    if (!validateBidPayloadSchema(req.body)) {
      return res.status(400).send(validateBidPayloadSchema.errors);
    }

    const payload = await encodeBid(
      auctionId,
      req.body.bidAmount,
      req.body.contractAddress,
      req.body.tokenId,
      req.body.minimumBid,
      req.body.startBlock,
      req.body.expireBlock
    );

    return res.status(200).send({ payload, auctionId, nftId });
  } catch (error) {
    next(error);
  }
});

// Endpoint to return auctions based on an array of inputs
router.post("/bids/list", limiter, async (req, res, next) => {
  try {
    if (validateBidsListPostSchema(req.body.nftIds)) {
      console.log("NftIds Array", req.body);
      let auctions = [];

      for (let i = 0; i < req.body.nftIds.length; i++) {
        try {
          // get file with key from fleek
          console.log("Attempting to fetch file", req.body.nftIds[i]);
          const file = await fleek.get({
            apiKey: secrets.apiKey,
            apiSecret: secrets.apiSecret,
            key: req.body.nftIds[i],
          });

          // parse file and return list of bids
          const auction = JSON.parse(file.data);
          auctions.push(auction);
        } catch (error) {
          console.log(error);
        }
      }
      return res.status(200).send(auctions);
    } else {
      console.log("nftIds array not provided, sending 400");
      return res.status(400).send({ message: "nftIds array required" });
    }
  } catch (error) {
    next(error);
  }
});

// Endpoint to return all bids by an account
router.get("/bids/accounts/:account", limiter, async (req, res, next) => {
  try {
    // get file with key from fleek
    const file = await fleek.get({
      apiKey: secrets.apiKey,
      apiSecret: secrets.apiSecret,
      key: req.params.account,
    });

    // parse file and return list of bids
    const bids = JSON.parse(file.data);
    return res.json(bids);
  } catch (error) {
    return res.json([]);
  }
});

// Creates a new bid for an auction
router.post("/bids/:nftId", limiter, async (req, res, next) => {
  try {
    // validate input data
    if (validateBidPostSchema(req.body)) {
      //instantiate contracts
      const erc20Contract = await getTokenContract();
      const zAuctionContract = await getZAuctionContract();

      //check balance
      const bal = await erc20Contract.balanceOf(req.body.account);
      const bigBal = ethers.BigNumber.from(bal);
      const bidAmount = ethers.BigNumber.from(req.body.bidAmount);
      console.log("Bal:", bal);
      if (bigBal.eq(bidAmount)) {
        return res
          .status(405)
          .send({ message: "Bidder has insufficient balance" });
      }

      //check start block/expire block
      const blockNum = await ethersProvider.getBlockNumber();
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
      const bidMessage = await encodeBid(
        req.body.auctionId,
        req.body.bidAmount,
        req.body.contractAddress,
        req.body.tokenId,
        req.body.minimumBid,
        req.body.startBlock,
        req.body.expireBlock
      );

      const unsignedMessage = await zAuctionContract.toEthSignedMessageHash(
        bidMessage
      );
      const recoveredAccount = await zAuctionContract.recover(
        unsignedMessage,
        req.body.signedMessage
      );

      if (recoveredAccount != req.body.account) {
        return res.status(405).send({
          message:
            "Account sent and account recovered from signature do not match",
        });
      }

      // try to pull auction from fleek with given auctionId
      let dateNow = new Date();

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
          account: req.body.account,
          signedMessage: req.body.signedMessage,
          auctionId: req.body.auctionId,
          bidAmount: req.body.bidAmount,
          minimumBid: req.body.minimumBid,
          startBlock: req.body.startBlock,
          expireBlock: req.body.expireBlock,
          date: dateNow,
        };

        // place the new bid object at the end of the array
        oldAuction.bids.push(newBid);
        const data = {
          tokenId: oldAuction.tokenId,
          contractAddress: oldAuction.contractAddress,
          bids: oldAuction.bids,
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
              date: dateNow,
            },
          ],
        };

        // upload to fleek for nftid sort
        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.params.nftId,
          data: JSON.stringify(data),
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
        date: dateNow,
      };

      try {
        let oldBids = await fleek.get({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.body.account,
        });
        let bids = JSON.parse(oldBids.data);
        console.log("old bids ", bids);
        bids.push(userBid);

        // delete the old auction
        await fleek.deleteFile({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.body.account,
        });

        // upload to fleek for user sort
        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.body.account,
          data: JSON.stringify(bids),
        });

        return res.status(200).send({ message: "Ok" });
      } catch (error) {
        // upload to fleek for user sort
        let firstBid = [];
        firstBid.push(userBid);
        console.log("first bid ", JSON.stringify(firstBid));

        await fleek.upload({
          apiKey: secrets.apiKey,
          apiSecret: secrets.apiSecret,
          key: req.body.account,
          data: JSON.stringify(firstBid),
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
    res.json(auction);
  } catch (error) {
    return res.json([]);
  }
});

export = router;
