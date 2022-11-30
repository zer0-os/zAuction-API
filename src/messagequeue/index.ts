import { CreateBatchOptions, EventData } from "@azure/event-hubs";
import { ServiceBusMessage } from "@azure/service-bus";
import {
  TypedMessage,
  BidPlacedV1Data,
  BidCancelledV1Data,
  Message,
} from "@zero-tech/zns-message-schemas";

export * from "./adapters";

export type QueueMessage = ServiceBusMessage | EventData

export interface MessageQueueService {
  sendMessage: (
    message: QueueMessage
  ) => Promise<void>;

  sendMessagesBatch: (
    messages: Message[],
    batchOptions: CreateBatchOptions
  ) => Promise<void>;
}
