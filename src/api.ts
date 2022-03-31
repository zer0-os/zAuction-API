import express from "express";
import rateLimit from "express-rate-limit";
import * as env from "env-var";

import {
  MessageType,
  TypedMessage,
  BidPlacedV1Data,
  BidCancelledV1Data,
} from "@zero-tech/zns-message-schemas";

import { adapters, BidDatabaseService } from "./database";
import { queueAdapters, MessageQueueService } from "./messagequeue";

// Ajv validation methods
import {
  validateBidPayloadSchema,
  validateBidPostSchema,
  validateBidsListPostSchema,
  validateBidsAccountsGetSchema,
  validateBidsGetSchema,
  validateBidCancelSchema,
  validateBidCancelEncodeSchema,
} from "./schemas";

import { encodeBid } from "./util/contracts";

import { calculateNftId, verifyEncodedBid } from "./util/auctions";

import {
  Bid,
  BidParams,
  BidPayloadPostDto,
  BidPostDto,
  BidsList,
  BidsListDto,
  UncertainBid,
  VerifyBidResponse,
} from "./types";

import { ethers } from "ethers";
import { retry } from "./util/retry";

const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

const db = env.get("MONGO_DB").required().asString();
const collection = env.get("MONGO_COLLECTION").required().asString();
const archiveCollection = env
  .get("MONGO_ARCHIVE_COLLECTION")
  .required()
  .asString();
const database: BidDatabaseService = adapters.mongo.create(db, collection);

const connectionString = env
  .get("EVENT_HUB_CONNECTION_STRING")
  .required()
  .asString();
const name = env.get("EVENT_HUB_NAME").required().asString();
const queue: MessageQueueService = queueAdapters.eventhub.create(
  connectionString,
  name
);

// Returns encoded data to be signed, a generated bidNonce,
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

      // Generate bidNonce, nftId
      const nftId = calculateNftId(dto.contractAddress, dto.tokenId);
      const bidNonce = Math.floor(Math.random() * 42949672960);

      // We use `bidNonce` to be clearer about what the variable actually represents
      // but any existing database records will still show `bidNonce`
      const payload = await encodeBid(
        bidNonce,
        dto.bidAmount,
        dto.contractAddress,
        dto.tokenId,
        dto.minimumBid,
        dto.startBlock,
        dto.expireBlock
      );

      const responseData = {
        payload,
        bidNonce,
        nftId,
      };

      return res.status(200).send(responseData);
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint to return auctions based on an array of given tokenIds
router.post(
  "/bids/list",
  limiter,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!validateBidsListPostSchema(req.body)) {
      return res.status(400).send(validateBidsListPostSchema.errors);
    }
    const dto: BidsListDto = req.body as BidsListDto;
    const tokenIdBids: BidsList = {};

    // Create an empty array for each given nftId
    for (const tokenId of dto.tokenIds) {
      tokenIdBids[tokenId] = [];
    }

    try {
      const bids: Bid[] = await database.getBidsByTokenIds(dto.tokenIds);

      // For each bid, map to appropriate tokenId array
      for (const bid of bids) {
        const tokenId = bid.tokenId;
        tokenIdBids[tokenId]?.push(bid);
      }
    } catch {
      next(new Error("Could not get bids for given nftIds"));
    }

    return res.status(200).send(tokenIdBids);
  }
);

// Endpoint to return all bids by an account
router.get(
  "/bids/accounts/:account",
  limiter,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!validateBidsAccountsGetSchema(req.params)) {
      return res.status(400).send(validateBidsListPostSchema.errors);
    }
    const accountId = req.params.account;

    try {
      const accountBids: Bid[] = await database.getBidsByAccount(accountId);
      return res.status(200).send(accountBids);
    } catch {
      next(new Error(`Could not get bids for account ${accountId}`));
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

    const dto: BidPostDto = req.body as BidPostDto;

    try {
      const bidParams: BidParams = {
        nftId: calculateNftId(dto.contractAddress, dto.tokenId),
        account: dto.account,
        bidNonce: dto.bidNonce,
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
        version: "2.0",
      };

      // Add new bid document to database
      await database.insertBid(newBid);

      const message: TypedMessage<BidPlacedV1Data> = {
        event: MessageType.BidPlaced,
        version: "1.0",
        timestamp: new Date().getTime(),
        logIndex: undefined,
        blockNumber: undefined,
        data: {
          nftId: newBid.nftId,
          account: newBid.account,
          auctionId: newBid.bidNonce,
          bidAmount: newBid.bidAmount,
          minimumBid: newBid.minimumBid,
          contractAddress: newBid.contractAddress,
          startBlock: newBid.startBlock,
          expireBlock: newBid.expireBlock,
          tokenId: newBid.tokenId,
          date: newBid.date,
          signedMessage: newBid.signedMessage,
        },
      };

      // Add new bid to our event queue
      await queue.sendMessage(message);

      return res.status(200).send({});
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint to return bids for a single tokenId
router.get(
  "/bids/:tokenId",
  limiter,
  async (req: express.Request, res: express.Response) => {
    if (!validateBidsGetSchema(req.params)) {
      return res.status(400).send(validateBidsGetSchema.errors);
    }
    const bids = await database.getBidsByTokenIds([req.params.tokenId]);
    return res.status(200).send(bids);
  }
);

// Create the cancel message hash to be signed by the user
router.post(
  "/bid/cancel/encode",
  limiter,
  async (req: express.Request, res: express.Response) => {
    if (!validateBidCancelEncodeSchema(req.body)) {
      return res.status(400).send(validateBidCancelEncodeSchema.errors);
    }
    const cancelMessage = "cancel - " + req.body.bidMessageSignature;
    const hashedCancelMessage = ethers.utils.id(cancelMessage);

    return res.status(200).send({ hashedCancelMessage });
  }
);

// Endpoint to cancel an existing bid
// Expecting signedBidMessage and signedCancelMessage in the body
router.post(
  "/bid/cancel",
  limiter,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!validateBidCancelSchema(req.body)) {
      return res.status(400).send(validateBidCancelSchema.errors);
    }
    try {
      const bidData: UncertainBid | null = await database.getBidBySignedMessage(
        req.body.bidMessageSignature
      );

      if (!bidData) return res.status(400).send("Bid not found");

      // Reconstruct the unsigned cancel message hash
      const cancelMessage = "cancel - " + bidData.signedMessage;
      const hashedCancelMessage = ethers.utils.hashMessage(cancelMessage);

      const signer = ethers.utils.verifyMessage(
        hashedCancelMessage,
        req.body.cancelMessageSignature
      );

      if (signer !== bidData.account) {
        return res.status(400).send("Incorrect signer address recovered");
      }

      // Once confirmed, move to archive collection
      await database.cancelBid(bidData, archiveCollection);

      const message: TypedMessage<BidCancelledV1Data> = {
        event: MessageType.BidCancelled,
        version: "1.0",
        timestamp: new Date().getTime(),
        logIndex: undefined,
        blockNumber: undefined,
        data: {
          account: signer,
          auctionId: bidData.bidNonce,
        },
      };

      await queue.sendMessage(message);

      return res.status(200).send({});
    } catch (e: any) {
      console.error(e.message, e.stack);
      next(
        new Error(
          `Could not delete bid with signature: ${req.body.bidMessageSignature}`
        )
      );
    }
  }
);
router.get(
  "/ping",
  limiter,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const infuraUrl = process.env["INFURA_URL"];
    if (!infuraUrl) {
      next(new Error("No Infura URL could be found"));
    }

    const pokeProvider = async () => {
      const sampleProvider = new ethers.providers.JsonRpcProvider(infuraUrl);
      return sampleProvider.getBlockNumber();
    };

    const blockNumber = await retry(pokeProvider);

    if (!blockNumber) {
      next(
        new Error("Looks like something went wrong with the Infura connection.")
      );
    }
    return res.status(200).send("OK");
  }
);

export = router;
