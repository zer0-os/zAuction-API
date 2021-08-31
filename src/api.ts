import express from "express";
import rateLimit from "express-rate-limit";
import * as env from "env-var";

import { adapters } from "./storage";

// Ajv validation methods
import {
  validateBidPayloadSchema,
  validateBidPostSchema,
  validateBidsListPostSchema,
  validateBidsAccountsGetSchema,
  validateBidsGetSchema,
} from "./schemas";

import {
  encodeBid,
  getTokenContract,
  getZAuctionContract,
} from "./util/contracts";

import {
  calculateNftId,
  getBidsForNft,
  verifyEncodedBid,
  getOrCreateAuction,
} from "./util/auctions";

import {
  Bid,
  BidParams,
  BidPayloadPostDto,
  BidPostDto,
  BidsList,
  BidsListDto,
  Maybe,
  UserAccount,
  VerifyBidResponse,
} from "./types";

import { Zauction } from "./types/contracts";

const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

const fleekBucket = env.get("STORAGE_BUCKET").asString();
const fileNamespace = env.get("NAMESPACE").asString();
const storage = adapters.fleek.create(fleekBucket, fileNamespace);

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
      const bids = await getBidsForNft(storage, nftId);
      nftBids[nftId] = bids;
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

    const fileKey = req.params.account.toLowerCase();
    let userBids: Bid[] = [];

    try {
      const fileContents = await storage.downloadFile(fileKey);
      const userAccount = JSON.parse(fileContents) as UserAccount;
      userBids = userAccount.bids;
    } catch {
      // intentional
    }

    return res.status(200).send(userBids);
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

    const dto: BidPostDto = req.body as BidPostDto;

    try {
      // Instantiate contracts
      const erc20Contract = await getTokenContract();
      const zAuctionContract: Zauction = await getZAuctionContract();

      const bidParams: BidParams = {
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
        dto.signedMessage,
        erc20Contract,
        zAuctionContract
      );

      if (!verification.pass) {
        return res
          .status(verification.status)
          .send({ message: verification.message });
      }

      // Try to pull auction from fleek with given auctionId
      const nftId = calculateNftId(dto.contractAddress, dto.tokenId);
      const auctionFileKey = nftId;
      const auctionFile = await storage.safeDownloadFile(auctionFileKey);
      const dateNow = new Date();

      const newBid: Bid = {
        ...bidParams,
        signedMessage: dto.signedMessage,
        date: dateNow.getTime(),
      };

      // Updates file to store on fleek with new bid data
      const auction = await getOrCreateAuction(newBid, auctionFile);
      auction.bids.push(newBid);

      await storage.uploadFile(auctionFileKey, JSON.stringify(auction));

      // Store bid by user on fleek
      let userAccount: Maybe<UserAccount>;

      const userAccountFileKey = dto.account.toLowerCase();
      const userAccountFile = await storage.safeDownloadFile(
        userAccountFileKey
      );

      if (userAccountFile.exists) {
        userAccount = JSON.parse(userAccountFile.data) as UserAccount;
      } else {
        userAccount = { bids: [] } as UserAccount;
      }

      userAccount.bids.push(newBid);

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
    const bids = await getBidsForNft(storage, req.params.nftId);
    return res.status(200).send(bids);
  }
);

export = router;
