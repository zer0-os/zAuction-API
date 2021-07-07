import Ajv, { JSONSchemaType } from "ajv";

const ajv = new Ajv({ coerceTypes: true });

// Ajv Schemas
interface BidPayloadPostInterface {
  bidAmount: string;
  tokenId: string;
  contractAddress: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
}
const BidPayloadPostSchema: JSONSchemaType<BidPayloadPostInterface> = {
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
};
export const validateBidPayloadSchema = ajv.compile(BidPayloadPostSchema);

interface BidPostInterface {
  account: string;
  auctionId: string;
  tokenId: string;
  contractAddress: string;
  bidAmount: string;
  bidMessage: string;
  minimumBid: string;
  startBlock: string;
  expireBlock: string;
  signedMessage: string;
}
const BidPostSchema: JSONSchemaType<BidPostInterface> = {
  type: "object",
  properties: {
    account: { type: "string" },
    auctionId: { type: "string" },
    tokenId: { type: "string" },
    contractAddress: { type: "string" },
    bidAmount: { type: "string" },
    bidMessage: { type: "string" },
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
    "bidMessage",
    "minimumBid",
    "startBlock",
    "expireBlock",
    "signedMessage",
  ],
};
export const validateBidPostSchema = ajv.compile(BidPostSchema);
