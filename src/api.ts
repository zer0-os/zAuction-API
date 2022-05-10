import express from "express";
import rateLimit from "express-rate-limit";
import * as env from "env-var";

import {
  MessageType,
  TypedMessage,
  BidCancelledV1Data,
  BidPlacedV2Data,
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

import { encodeBid, getPaymentTokenForDomain, getZAuctionContract } from "./util/contracts";

import { verifyEncodedBid } from "./util/auctions";

import {
  Bid,
  BidParams,
  BidPayloadPostDto,
  BidPostDto,
  BidsList,
  BidsListDto,
  VerifyBidResponse,
} from "./types";

import { ethers } from "ethers";
import { retry } from "./util/retry";
import { getBidFilterStatus } from "./util/requests";

const router = express.Router();

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Window size
  max: 200, // limit each IP to X requests per windowMs
});

const db = env.get("MONGO_DB").required().asString();
const collection = env.get("MONGO_COLLECTION").required().asString();
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

      // Generate bidNonce
      const bidNonce = Math.floor(Math.random() * 42949672960);

      const paymentToken = await getPaymentTokenForDomain(dto.tokenId);

      if (dto.bidToken && dto.bidToken !== paymentToken) {
        next(new Error("Wrong payment token given for bid."))
      }

      // We use `bidNonce` to be clearer about what the variable actually represents
      // but any older database records may still show `auctionId`
      const payload = await encodeBid(
        bidNonce,
        dto.bidAmount,
        dto.tokenId,
        dto.minimumBid,
        dto.startBlock,
        dto.expireBlock,
        paymentToken
      );

      const responseData = {
        payload,
        bidNonce,
      };

      return res.status(200).send(responseData);
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint to return auctions based on an array of given tokenIds, filterable by bid cancellation status
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
    const filterParam = getBidFilterStatus(req.query.filter?.toString());
    const dto: BidsListDto = req.body as BidsListDto;
    const tokenIdBids: BidsList = {};

    // Create an empty array for each given nftId
    for (const tokenId of dto.tokenIds) {
      tokenIdBids[tokenId] = [];
    }

    try {
      const bids: Bid[] = await database.getBidsByTokenIds(dto.tokenIds, filterParam);

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

// Endpoint to return all bids by an account, filterable by bid cancellation status
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
    const filterParam = getBidFilterStatus(req.query.filter?.toString());
    try {
      const accountBids: Bid[] = await database.getBidsByAccount(accountId, filterParam);
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

    const contract = await getZAuctionContract();
    const paymentToken = await contract.getPaymentTokenForDomain(dto.tokenId);

    if (dto.bidToken && dto.bidToken !== paymentToken) {
      next(new Error("Wrong payment token given for bid."))
    }

    try {
      const bidParams: BidParams = {
        account: dto.account,
        bidNonce: dto.bidNonce,
        bidAmount: dto.bidAmount,
        contractAddress: dto.contractAddress,
        tokenId: dto.tokenId,
        minimumBid: dto.minimumBid,
        startBlock: dto.startBlock,
        expireBlock: dto.expireBlock,
        bidToken: paymentToken
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

      const dateNow = new Date().getTime();
      const newBid: Bid = {
        ...bidParams,
        signedMessage: dto.signedMessage,
        date: dateNow,
        version: "2.0",
      };

      // Add new bid document to database
      await database.insertBid(newBid);

      const message: TypedMessage<BidPlacedV2Data> = {
        event: MessageType.BidPlaced,
        version: "2.0",
        timestamp: dateNow,
        logIndex: undefined,
        blockNumber: undefined,
        data: {
          ...newBid,
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
    const filterParam = getBidFilterStatus(req.query.filter?.toString());
    const bids = await database.getBidsByTokenIds([req.params.tokenId], filterParam);
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

    const bidData: Bid | null = await database.getBidBySignedMessage(
      req.body.bidMessageSignature
    );

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
      const bidData: Bid | null = await database.getBidBySignedMessage(
        req.body.bidMessageSignature
      );

      if (!bidData) return res.status(400).send("Bid not found");
      if (bidData.cancelDate && bidData.cancelDate > 0) return res.status(409).send("Bid is no longer active");

      // Reconstruct the unsigned cancel message hash, using same format as cancel/encode
      const cancelMessage = "cancel - " + bidData.signedMessage;

      const signer = ethers.utils.verifyMessage(
        ethers.utils.id(cancelMessage),
        req.body.cancelMessageSignature
      );

      if (signer.toLowerCase() !== bidData.account.toLowerCase()) {
        return res.status(400).send("Incorrect signer address recovered");
      }

      // Once confirmed, update bid with cancelDate
      let timeStamp = new Date().getTime();
      const cancelledBid: Bid = {
        ...bidData,
        cancelDate: timeStamp,
      }
      await database.cancelBid(cancelledBid, collection);

      const message: TypedMessage<BidCancelledV1Data> = {
        event: MessageType.BidCancelled,
        version: "1.0",
        timestamp: timeStamp,
        logIndex: undefined,
        blockNumber: undefined,
        data: {
          account: signer,
          bidNonce: cancelledBid.bidNonce,
          version: cancelledBid.version,
          cancelDate: timeStamp,
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
