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
    contractAddress: { type: "string", nullable: true },
    minimumBid: { type: "string" },
    startBlock: { type: "string" },
    expireBlock: { type: "string" },
    bidToken: { type: "string", nullable: true },
  },
  required: ["bidAmount", "tokenId", "minimumBid", "startBlock", "expireBlock"],
  additionalProperties: false,
};
export const validateBidPayloadSchema = ajv.compile(bidPayloadPostSchema);

const bidPostSchema: JSONSchemaType<BidPostDto> = {
  type: "object",
  properties: {
    account: { type: "string" },
    bidNonce: { type: "string" },
    tokenId: { type: "string" },
    contractAddress: { type: "string" },
    bidAmount: { type: "string" },
    minimumBid: { type: "string" },
    startBlock: { type: "string" },
    expireBlock: { type: "string" },
    signedMessage: { type: "string" },
    bidToken: { type: "string", nullable: true },
  },
  required: [
    "account",
    "bidNonce",
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
    tokenIds: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
  },
  required: ["tokenIds"],
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
    tokenId: { type: "string" },
  },
  required: ["tokenId"],
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
