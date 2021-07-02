import Ajv, { JSONSchemaType } from "ajv";

const ajv = new Ajv({ coerceTypes: true });

// Ajv Schemas
interface BidPayloadPostInterface {
  bidAmount: number;
  contractAddress: string;
  tokenId: number;
  minimumBid: number;
  startBlock: number;
  expireBlock: number;
}
const BidPayloadPostSchema: JSONSchemaType<BidPayloadPostInterface> = {
  type: "object",
  properties: {
    bidAmount: { type: "integer" },
    contractAddress: { type: "string" },
    tokenId: { type: "integer" },
    minimumBid: { type: "integer" },
    startBlock: { type: "integer" },
    expireBlock: { type: "integer" },
  },
  required: [
    "bidAmount",
    "contractAddress",
    "tokenId",
    "minimumBid",
    "startBlock",
    "expireBlock",
  ],
};
export const validateBidPayloadSchema = ajv.compile(BidPayloadPostSchema);

interface BidPostInterface {
  account: string;
  auctionId: number;
  tokenId: number;
  contractAddress: string;
  bidAmount: number;
  bidMessage: string;
  minimumBid: number;
  startBlock: number;
  expireBlock: number;
  signedMessage: string;
}
const BidPostSchema: JSONSchemaType<BidPostInterface> = {
  type: "object",
  properties: {
    account: { type: "string" },
    auctionId: { type: "integer" },
    tokenId: { type: "integer" },
    contractAddress: { type: "string" },
    bidAmount: { type: "integer" },
    bidMessage: { type: "string" },
    minimumBid: { type: "integer" },
    startBlock: { type: "integer" },
    expireBlock: { type: "integer" },
    signedMessage: { type: "string" },
  },
  required: [
    "account",
    "auctionId",
    "tokenId",
    "contractAddress",
    "bidAmount",
    "bidMessage",
    "minimumBid",
    "startBlock",
    "expireBlock",
    "signedMessage",
  ],
};
export const validateBidPostSchema = ajv.compile(BidPostSchema);
