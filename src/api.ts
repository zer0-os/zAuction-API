import express from "express";
import fleek from "@fleekhq/fleek-storage-js";
import rateLimit from "express-rate-limit";
import { ethers } from "ethers";
import * as env from "env-var";

// Ajv validation methods
import {
  BidsListDto,
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
import { adapters } from "./storage";
import { Auction, AuctionBid, Bid, Maybe, UserAccount } from "./types";
import { getBidsForNft } from "./util";


const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

const fleekBucket = env.get("STORAGE_BUCKET").asString();
const storage = adapters.fleek.create(fleekBucket);

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
  if (!validateBidsListPostSchema(req.body)) {
    return res.status(400).send(validateBidsListPostSchema.errors);
  }

  const dto: BidsListDto = req.body;

  interface BidsList {
    [nftId: string]: Bid[] | undefined;
  }

  const nftBids: BidsList = {};

  for (let nftId of dto.nftIds) {
    const bids = await getBidsForNft(storage, nftId);
    nftBids[nftId] = bids;
  }

  return res.status(200).send(JSON.stringify(nftBids));
});

// Endpoint to return all bids by an account
router.get("/bids/accounts/:account", limiter, async (req, res, next) => {
  const fileKey = req.params.account;
  let userBids: AuctionBid[] = [];

  try {
    const fileContents = await storage.downloadFile(fileKey);
    const userAccount = JSON.parse(fileContents) as UserAccount;
    userBids = userAccount.bids;
  } catch {

  }

  return userBids;
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

      let auction: Maybe<Auction>;

      const auctionFileKey = req.params.nftId;
      const auctionExists = await storage.fileExists(auctionFileKey);

      if (auctionExists) {
        const fileContents = await storage.downloadFile(auctionFileKey);
        auction = JSON.parse(fileContents) as Auction;
      } else {
        auction = {
          tokenId: req.body.tokenId,
          contractAddress: req.body.contractAddress,
          bids: []
        } as Auction;
      }

      const newBid: Bid = {
        account: req.body.account,
        signedMessage: req.body.signedMessage,
        auctionId: req.body.auctionId,
        bidAmount: req.body.bidAmount,
        minimumBid: req.body.minimumBid,
        startBlock: req.body.startBlock,
        expireBlock: req.body.expireBlock,
        date: dateNow.getTime(),
      };
      auction.bids.push(newBid);

      await storage.uploadFile(auctionFileKey, JSON.stringify(auction));

      //store bid by user
      const fullUserBid: AuctionBid = {
        ...newBid,
        tokenId: req.body.tokenId,
        contractAddress: req.body.contractAddress
      }

      let userAccount: Maybe<UserAccount>;

      const userBidsFileKey = req.params.account;
      const userBidsExists = await storage.fileExists(userBidsFileKey);

      if (userBidsExists) {
        const fileContents = await storage.downloadFile(userBidsFileKey);
        userAccount = JSON.parse(fileContents) as UserAccount;
      } else {
        userAccount = { bids: [] } as UserAccount;
      }

      userAccount.bids.push(fullUserBid)

      await storage.uploadFile(userBidsFileKey, JSON.stringify(userAccount));

      return res.sendStatus(200);
    } else {
      return res.status(400).send(validateBidPostSchema.errors);
    }
  } catch (error) {
    next(error);
  }
});

// Endpoint to return current highest bid given nftId
router.get("/bids/:nftId", limiter, async (req, res, next) => {
  const bids = getBidsForNft(storage, req.params.nftId)
  return res.json(bids);
});

export = router;
