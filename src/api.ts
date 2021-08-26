import express from "express";
import rateLimit from "express-rate-limit";
// import { ethers } from "ethers";
import * as env from "env-var";

import { adapters } from "./storage";
import { calculateNftId, getBidsForNft, verifyEncodedBid } from "./util/auctions";

// Ajv validation methods
import {
  validateBidPayloadSchema,
  validateBidPostSchema,
  validateBidsListPostSchema,
  validateBidsAccountsGetSchema
} from "./schemas";
import {
  encodeBid,
  getTokenContract,
  getZAuctionContract,
} from "./util/contracts";
import { 
  Auction,
  Bid,
  BidPostDto,
  BidsList,
  BidsListDto,
  Maybe,
  UserAccount } from "./types";
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
//
// POST <base-uri>/api/bid
//
// Headers:
//   Content-Type: application/json
//
// Body:
//   {
//     "bidAmount": <string>,
//     "contractAddress": <string>,
//     "tokenId": <string>,
//     "minimumBid": <string>,
//     "startBlock": <string>,
//     "expireBlock": <string>
//   }
//
// Response:
//   {
//     "payload": <string>,
//     "auctionId": <number>,
//     "nftId": <string>
//   }
router.post("/bid", limiter, async (req, res, next) => {
  try {
    if (!validateBidPayloadSchema(req.body)) { // access before validation
      return res.status(400).send(validateBidPayloadSchema.errors);
    }

    // Generate auctionId, nftId
    const nftId = calculateNftId(req.body.contractAddress, req.body.tokenId);
    const auctionId = Math.floor(Math.random() * 42949672960);

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

// Endpoint to return auctions based on an array of given nftIds
//
// POST <base-uri>/api/bids/list
//
// Headers:
//   Content-Type: application/json
//
// Body:
//   {
//     "nftIds": [
//        <string>,
//        <string>,
//        ...
//      ]
//   }
//
// Response:
//   {
//     "0x123...": [
//        "account": <string>,
//        "signedMessage": <string>,
//        "auctionId": <string>,
//        "bidAmount": <string>,
//        "minimumBid": <string>,
//        "startBlock": <string>,
//        "expireblock": <string>,
//        "date": <number>,
//        "tokenId": <string>,
//        "contractAddress": <string>
//      ],
//      ...
//   }
router.post("/bids/list", limiter, async (req, res) => {
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

  return res.status(200).send(JSON.stringify(nftBids));
});

// Endpoint to return all bids by an account
//
// GET <base-uri>/api/bids/accounts/:account
//
// Headers:
//   Content-Type: application/json
//
// Body: N/A
//
// Response:
//    [
//      {
//        "account": <string>,
//        "signedMessage": <string>,
//        "auctionId": <string>,
//        "bidAmount": <string>,
//        "minimumBid": <string>,
//        "startBlock": <string>,
//        "expireblock": <string>,
//        "date": <number>,
//        "tokenId": <string>,
//        "contractAddress": <string>
//      }
//    ]
router.get("/bids/accounts/:account", limiter, async (req, res) => {
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

  return res.json(userBids);
});

// Creates a new bid for an auction once signed
router.post("/bids", limiter, async (req, res, next) => {
  if (!validateBidPostSchema(req.body)) {
    return res.status(400).send(validateBidPostSchema.errors);
  }

  // check balance, block number, if consumed, if account recoverable
  const dto: BidPostDto = req.body as BidPostDto;

  try {
    // Instantiate contracts
    const erc20Contract = await getTokenContract();
    const zAuctionContract: Zauction = await getZAuctionContract();

    // Perform necessary checks to ensure account is able to make the bid
    const verification = await verifyEncodedBid(dto, erc20Contract, zAuctionContract);

    if (!verification.verify) {
      return res
      .status(verification.status)
      .send({ message: verification.message })
    }

    const nftId = calculateNftId(dto.contractAddress, dto.tokenId);

    // Try to pull auction from fleek with given auctionId
    const dateNow = new Date();

    let auction: Maybe<Auction>;

    const auctionFileKey = nftId;
    const auctionFile = await storage.safeDownloadFile(auctionFileKey);

    if (auctionFile.exists) {
      auction = JSON.parse(auctionFile.data) as Auction;
    } else {
      auction = {
        tokenId: dto.tokenId,
        contractAddress: dto.contractAddress,
        bids: [],
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
      tokenId: dto.tokenId,
      contractAddress: dto.contractAddress,
    };
    auction.bids.push(newBid);

    await storage.uploadFile(auctionFileKey, JSON.stringify(auction));

    //store bid by user

    let userAccount: Maybe<UserAccount>;

    const userAccountFileKey = dto.account.toLowerCase();
    const userAccountFile = await storage.safeDownloadFile(userAccountFileKey);

    if (userAccountFile.exists) {
      userAccount = JSON.parse(userAccountFile.data) as UserAccount;
    } else {
      userAccount = { bids: [] } as UserAccount;
    }

    userAccount.bids.push(newBid);

    await storage.uploadFile(userAccountFileKey, JSON.stringify(userAccount));

    return res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// Endpoint to return current highest bid given nftId
router.get("/bids/:nftId", limiter, async (req, res) => {
  const bids = await getBidsForNft(storage, req.params.nftId);
  return res.json(bids);
});

export = router;
