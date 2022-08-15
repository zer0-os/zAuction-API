import { CreateBatchOptions } from "@azure/event-hubs";
import {
  TypedMessage,
  BidPlacedV1Data,
  BidPlacedV2Data,
  BidCancelledV1Data,
  Message,
} from "@zero-tech/zns-message-schemas";

export * from "./adapters";

export interface MessageQueueService {
  sendMessage: (
    message: TypedMessage<
      BidPlacedV1Data | BidPlacedV2Data | BidCancelledV1Data
    >
  ) => Promise<void>;

  sendMessagesBatch: (
    messages: Message[],
    batchOptions: CreateBatchOptions
  ) => Promise<void>;
}
