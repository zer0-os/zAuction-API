import {
  CreateBatchOptions,
  EventData,
  EventHubProducerClient,
} from "@azure/event-hubs";
import { Message } from "@zero-tech/zns-message-schemas";
import { MessageQueueService, QueueMessage } from "..";

export const create = (
  connectionString: string,
  name: string
): MessageQueueService => {
  const sendMessage = async (message: QueueMessage) => {
    const producer: EventHubProducerClient = new EventHubProducerClient(
      connectionString,
      name
    );
    const batch = await producer.createBatch();

    const event: EventData = {
      body: message,
    };

    batch.tryAdd(event);

    await producer.sendBatch(batch);
    await producer.close();
  };

  const sendMessagesBatch = async (
    messages: Message[],
    batchOptions: CreateBatchOptions
  ) => {
    const producer: EventHubProducerClient = new EventHubProducerClient(
      connectionString,
      name
    );
    let batchesSent = 0;
    try {
      let batch = await producer.createBatch(batchOptions);
      const promise = messages.map(async (message) => {
        const messageEvent: EventData = {
          body: message,
        };
        const batchAdded = await batch.tryAdd(messageEvent);
        if (!batchAdded) {
          console.log(
            `Sending ${
              batch.count
            } messages as a single batch. Current Batch Number ${
              batchesSent + 1
            }.`
          );
          //Send current batch
          await producer.sendBatch(batch);
          batchesSent++;

          // create a new batch to house the next set of messages
          batch = await producer.createBatch(batchOptions);
        }
      });
      await Promise.resolve(promise);
      //Send remaining items in current batch
      if (batch.count > 0) {
        await producer.sendBatch(batch);
        batchesSent++;
      }
    } catch (err) {
      throw new Error(
        `Error when creating & sending a batch of messages: ${err}"`
      );
    }

    await producer.close();
    console.log(`Batch Messaging Complete, ${batchesSent} batches sent.`);
  };

  const messageQueueService: MessageQueueService = {
    sendMessage,
    sendMessagesBatch,
  };
  return messageQueueService;
};
