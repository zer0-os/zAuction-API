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
import { Auction, AuctionBid, Bid, BidPostDto, Maybe, UserAccount } from "./types";
import { calculateNftId, getBidsForNft } from "./util";


const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

const fleekBucket = env.get("STORAGE_BUCKET").asString();
const fileNamespace = env.get("NAMESPACE").asString();
const storage = adapters.fleek.create(fleekBucket, fileNamespace);

// Returns encoded data to be signed, an random auction id,
//  and an nft id determined by nft contract address and token id
router.post("/bid", limiter, async (req, res, next) => {
  try {
    // generate auctionid, nftid
    const nftId = calculateNftId(req.body.contractAddress, req.body.tokenId);

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
router.post("/bids", limiter, async (req, res, next) => {
  if (!validateBidPostSchema(req.body)) {
    return res.status(400).send(validateBidPostSchema.errors);
  }

  const dto: BidPostDto = req.body as BidPostDto;

  try {
    //instantiate contracts
    const erc20Contract = await getTokenContract();
    const zAuctionContract = await getZAuctionContract();

    const nftId = calculateNftId(dto.contractAddress, dto.tokenId);

    //check balance
    const userBalance = await erc20Contract.balanceOf(dto.account);
    const bidAmount = ethers.BigNumber.from(dto.bidAmount);
    if (userBalance.lt(bidAmount)) {
      return res
        .status(405)
        .send({ message: "Bidder has insufficient balance" });
    }

    //check start block/expire block
    const blockNum = ethers.BigNumber.from(await ethersProvider.getBlockNumber());
    const start = ethers.BigNumber.from(dto.startBlock);
    const expire = ethers.BigNumber.from(dto.expireBlock);

    if (blockNum.lt(start)) {
      return res
        .status(405)
        .send({ message: "Current block is less than start block" });
    }

    if (blockNum.gt(expire)) {
      return res.status(405).send({
        message: "Current block is equal to or greater than expire block",
      });
    }

    //check if auctionid is consumed already
    const alreadyConsumed = await zAuctionContract.consumed(
      dto.account,
      dto.auctionId
    );

    if (alreadyConsumed) {
      return res.status(405).send({
        message: "This account has already consumed this auction id",
      });
    }

    //check signature recovers correct account
    const bidMessage = await encodeBid(
      dto.auctionId,
      dto.bidAmount,
      dto.contractAddress,
      dto.tokenId,
      dto.minimumBid,
      dto.startBlock,
      dto.expireBlock
    );

    const unsignedMessage = await zAuctionContract.toEthSignedMessageHash(
      bidMessage
    );
    const recoveredAccount = await zAuctionContract.recover(
      unsignedMessage,
      dto.signedMessage
    );

    if (recoveredAccount != dto.account) {
      return res.status(405).send({
        message:
          "Account sent and account recovered from signature do not match",
      });
    }

    // try to pull auction from fleek with given auctionId
    let dateNow = new Date();

    let auction: Maybe<Auction>;

    const auctionFileKey = nftId;
    const auctionFile = await storage.safeDownloadFile(auctionFileKey);

    if (auctionFile.exists) {
      auction = JSON.parse(auctionFile.data) as Auction;
    } else {
      auction = {
        tokenId: dto.tokenId,
        contractAddress: dto.contractAddress,
        bids: []
      } as Auction;
    }

    const newBid: Bid = {
      account: dto.account,
      signedMessage: dto.signedMessage,
      auctionId: dto.auctionId,
      bidAmount: dto.bidAmount,
      minimumBid: dto.minimumBid,
      startBlock: dto.startBlock,
      expireBlock: dto.expireBlock,
      date: dateNow.getTime(),
    };
    auction.bids.push(newBid);

    await storage.uploadFile(auctionFileKey, JSON.stringify(auction));

    //store bid by user
    const fullUserBid: AuctionBid = {
      ...newBid,
      tokenId: dto.tokenId,
      contractAddress: dto.contractAddress
    }

    let userAccount: Maybe<UserAccount>;

    const userAccountFileKey = req.params.account;
    const userAccountFile = await storage.safeDownloadFile(userAccountFileKey);

    if (userAccountFile.exists) {
      userAccount = JSON.parse(userAccountFile.data) as UserAccount;
    } else {
      userAccount = { bids: [] } as UserAccount;
    }

    userAccount.bids.push(fullUserBid)

    await storage.uploadFile(userAccountFileKey, JSON.stringify(userAccount));

    return res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// Endpoint to return current highest bid given nftId
router.get("/bids/:nftId", limiter, async (req, res, next) => {
  const bids = await getBidsForNft(storage, req.params.nftId);
  return res.json(bids);
});

export = router;
