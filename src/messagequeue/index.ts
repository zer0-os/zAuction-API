import { BidCancelledMessage, BidPlacedMessage } from "../types";

export * from "./adapters"

export interface MessageQueueService {
    sendMessage: (message: (BidPlacedMessage | BidCancelledMessage)) => void;
}