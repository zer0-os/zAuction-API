import { EventData, EventHubProducerClient } from "@azure/event-hubs";
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

  const messageQueueService: MessageQueueService = {
    sendMessage,
  };
  return messageQueueService;
};
