import express from "express";
import rateLimit from "express-rate-limit";
import * as env from "env-var";

import { adapters, MongoStorageService } from "./storage";

// Ajv validation methods
import {
  validateBidPayloadSchema,
  validateBidPostSchema,
  validateBidsListPostSchema,
  validateBidsAccountsGetSchema,
  validateBidsGetSchema,
} from "./schemas";

import { encodeBid } from "./util/contracts";

import {
  calculateNftId,
  verifyEncodedBid,
  getBidsForNft,
  getBidsForAccount,
} from "./util/auctions";

import {
  Bid,
  BidParams,
  BidPayloadPostDto,
  BidPostDto,
  BidsList,
  BidsListDto,
  VerifyBidResponse,
} from "./types";

import { getFleekConnection } from "./util";

const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

// const fleekBucket = env.get("STORAGE_BUCKET").asString();
// const fileNamespace = env.get("NAMESPACE").asString();
// const storage: StorageService = adapters.fleek.create(fleekBucket, fileNamespace);

const db = env.get("MONGO_DB").required().asString();
const collection = env.get("MONGO_COLLECTION").required().asString();
const mongoStorage: MongoStorageService = adapters.mongo.create(db, collection);

// Returns encoded data to be signed, a generated auctionId,
// and a generated nftId determined by the NFT contract address and tokenId
router.post(
  "/bid",
  limiter,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      if (!validateBidPayloadSchema(req.body)) {
        return res.status(400).send(validateBidPayloadSchema.errors);
      }
      const dto: BidPayloadPostDto = req.body as BidPayloadPostDto;

      // Generate auctionId, nftId
      const nftId = calculateNftId(dto.contractAddress, dto.tokenId);
      const auctionId = Math.floor(Math.random() * 42949672960);

      const payload = await encodeBid(
        auctionId,
        dto.bidAmount,
        dto.contractAddress,
        dto.tokenId,
        dto.minimumBid,
        dto.startBlock,
        dto.expireBlock
      );

      const responseData = {
        payload,
        auctionId,
        nftId,
      };

      return res.status(200).send(responseData);
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint to return auctions based on an array of given nftIds
router.post(
  "/bids/list",
  limiter,
  async (req: express.Request, res: express.Response) => {
    if (!validateBidsListPostSchema(req.body)) {
      return res.status(400).send(validateBidsListPostSchema.errors);
    }
    const dto: BidsListDto = req.body as BidsListDto;
    const nftBids: BidsList = {};

    // Get all of the bids on every provided nftId
    for (const nftId of dto.nftIds) {
      try {
        const mongoBids = await getBidsForNft(mongoStorage, nftId);
        nftBids[nftId] = mongoBids;
      } catch {
        // Returns 500
        throw Error(`Failed to list bids for NFT: ${nftId}`);
      }
    }
    return res.status(200).send(nftBids);
  }
);

// Endpoint to return all bids by an account
router.get(
  "/bids/accounts/:account",
  limiter,
  async (req: express.Request, res: express.Response) => {
    if (!validateBidsAccountsGetSchema(req.params)) {
      return res.status(400).send(validateBidsListPostSchema.errors);
    }
    const accountId = req.params.account;

    try {
      const accountBids: Bid[] = await getBidsForAccount(
        mongoStorage,
        accountId
      );
      return res.status(200).send(accountBids);
    } catch {
      throw Error(`Could not get bids for account ${accountId}`);
    }
  }
);

// Creates a new bid for an auction once signed by user
router.post(
  "/bids",
  limiter,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!validateBidPostSchema(req.body)) {
      return res.status(400).send(validateBidPostSchema.errors);
    }
    const storage = getFleekConnection();
    const dto: BidPostDto = req.body as BidPostDto;

    try {
      const bidParams: BidParams = {
        nftId: calculateNftId(dto.contractAddress, dto.tokenId),
        account: dto.account,
        auctionId: dto.auctionId,
        bidAmount: dto.bidAmount,
        contractAddress: dto.contractAddress,
        tokenId: dto.tokenId,
        minimumBid: dto.minimumBid,
        startBlock: dto.startBlock,
        expireBlock: dto.expireBlock,
      };

      // Perform necessary checks to ensure account is able to make the bid
      // Check balance, block number, if consumed, if account recoverable
      const verification: VerifyBidResponse = await verifyEncodedBid(
        bidParams,
        dto.signedMessage
      );

      if (!verification.pass) {
        return res
          .status(verification.status)
          .send({ message: verification.message });
      }

      const dateNow = new Date();
      const newBid: Bid = {
        ...bidParams,
        signedMessage: dto.signedMessage,
        date: dateNow.getTime(),
      };

      // Add new bid document to database
      await mongoStorage.uploadData(newBid);

      return res.status(200).send("OK");
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint to return current highest bid given nftId
router.get(
  "/bids/:nftId",
  limiter,
  async (req: express.Request, res: express.Response) => {
    if (!validateBidsGetSchema(req.params)) {
      return res.status(400).send(validateBidsGetSchema.errors);
    }
    const mongoBids = await getBidsForNft(mongoStorage, req.params.nftId);
    return res.status(200).send(mongoBids);
  }
);

export = router;
