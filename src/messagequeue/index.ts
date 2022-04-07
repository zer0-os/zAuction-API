import { CreateBatchOptions } from "@azure/event-hubs";
import {
  TypedMessage,
  BidPlacedV1Data,
  BidCancelledV1Data,
} from "@zero-tech/zns-message-schemas";

export * from "./adapters";

export interface MessageQueueService {
  sendMessage: (
    message: TypedMessage<BidPlacedV1Data> | TypedMessage<BidCancelledV1Data>
  ) => Promise<void>;

  sendMessagesBatch: (
    messages: TypedMessage<BidPlacedV1Data>[] | TypedMessage<BidCancelledV1Data>[],
    batchOptions: CreateBatchOptions
  ) => Promise<void>;
}
