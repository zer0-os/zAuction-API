import { CreateBatchOptions, EventData, EventHubProducerClient } from "@azure/event-hubs";
import { Message } from "@zero-tech/zns-message-schemas";
import { MessageQueueService } from "..";

export const create = (
  connectionString: string,
  name: string
): MessageQueueService => {
  const sendMessage = async (message: Message) => {
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

  const sendMessagesBatch = async(messages: Message[], batchOptions: CreateBatchOptions) => {
    try {
      const producer: EventHubProducerClient = new EventHubProducerClient(
        connectionString,
        name
      );

      let batch = await producer.createBatch(batchOptions);
      let batchesSent = 0

      for (let i = 0; i < messages.length; i++ )
      {
        const messageEvent: EventData = {
          body: messages[i],
        };
        if (!batch.tryAdd(messageEvent) || i === messages.length-1) {
          console.log(
            `Sending ${batch.count} messages as a single batch. Current Batch Number ${batchesSent + 1}.`
          );
          await producer.sendBatch(batch);
          batchesSent++;

          // create a new batch to house the next set of messages
          batch =  await producer.createBatch(batchOptions);
        }
      }
      await producer.close();
      console.log(`Batch Messaging Complete, ${batchesSent} batches sent.`);
    } catch (err) {
      console.error("Error when creating & sending a batch of messages: ", err);
    }
  };
  
  const messageQueueService: MessageQueueService = {
    sendMessage,
    sendMessagesBatch
  };
  return messageQueueService;
};
