import Ajv, { JSONSchemaType } from "ajv";
import {
  BidPayloadPostDto,
  BidPostDto,
  BidsListDto,
  BidsAccountsDto,
  BidsDto,
  BidCancelDto,
  BidCancelEncode,
} from "./types";

const ajv = new Ajv({ coerceTypes: true });

// Ajv Schemas
const bidPayloadPostSchema: JSONSchemaType<BidPayloadPostDto> = {
  type: "object",
  properties: {
    bidAmount: { type: "string" },
    tokenId: { type: "string" },
    contractAddress: { type: "string" },
    minimumBid: { type: "string" },
    startBlock: { type: "string" },
    expireBlock: { type: "string" },
  },
  required: [
    "bidAmount",
    "contractAddress",
    "tokenId",
    "minimumBid",
    "startBlock",
    "expireBlock",
  ],
  additionalProperties: false,
};
export const validateBidPayloadSchema = ajv.compile(bidPayloadPostSchema);

const bidPostSchema: JSONSchemaType<BidPostDto> = {
  type: "object",
  properties: {
    account: { type: "string" },
    auctionId: { type: "string" },
    tokenId: { type: "string" },
    contractAddress: { type: "string" },
    bidAmount: { type: "string" },
    minimumBid: { type: "string" },
    startBlock: { type: "string" },
    expireBlock: { type: "string" },
    signedMessage: { type: "string" },
  },
  required: [
    "account",
    "auctionId",
    "tokenId",
    "contractAddress",
    "bidAmount",
    "minimumBid",
    "startBlock",
    "expireBlock",
    "signedMessage",
  ],
};
export const validateBidPostSchema = ajv.compile(bidPostSchema);

const bidsListPostSchema: JSONSchemaType<BidsListDto> = {
  type: "object",
  properties: {
    nftIds: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
  },
  required: ["nftIds"],
  additionalProperties: false,
};

export const validateBidsListPostSchema = ajv.compile(bidsListPostSchema);

const bidsAccountsGetSchema: JSONSchemaType<BidsAccountsDto> = {
  type: "object",
  properties: {
    account: { type: "string" },
  },
  required: ["account"],
};

export const validateBidsAccountsGetSchema = ajv.compile(bidsAccountsGetSchema);

const bidsGetSchema: JSONSchemaType<BidsDto> = {
  type: "object",
  properties: {
    nftId: { type: "string" },
  },
  required: ["nftId"],
};

export const validateBidsGetSchema = ajv.compile(bidsGetSchema);

const bidCancelEncodeSchema: JSONSchemaType<BidCancelEncode> = {
  type: "object",
  properties: {
    bidMessageSignature: { type: "string" },
  },
  required: ["bidMessageSignature"],
  additionalProperties: false,
};

export const validateBidCancelEncodeSchema = ajv.compile(bidCancelEncodeSchema);

const bidCancelSchema: JSONSchemaType<BidCancelDto> = {
  type: "object",
  properties: {
    cancelMessageSignature: { type: "string" },
    bidMessageSignature: { type: "string" },
  },
  required: ["cancelMessageSignature", "bidMessageSignature"],
  additionalProperties: false,
};

export const validateBidCancelSchema = ajv.compile(bidCancelSchema);
