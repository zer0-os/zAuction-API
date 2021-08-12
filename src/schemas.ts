import Ajv, { JSONSchemaType } from "ajv";
import { BidPostDto } from "./types";

const ajv = new Ajv({ coerceTypes: true });

// Ajv Schemas
interface BidPayloadPostDto {
  bidAmount: string;
  tokenId: string;
  contractAddress: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
}
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

export interface BidsListDto {
  nftIds: string[];
}

const BidsListPostSchema: JSONSchemaType<BidsListDto> = {
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

export const validateBidsListPostSchema = ajv.compile(BidsListPostSchema);
