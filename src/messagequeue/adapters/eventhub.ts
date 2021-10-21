import { EventData, EventHubProducerClient } from "@azure/event-hubs";
import { BaseMessage } from "../../types";

export const create = (connectionString: string, name: string) => {
  const producer: EventHubProducerClient = new EventHubProducerClient(
    connectionString,
    name
  );

  const sendMessage = async (message: BaseMessage) => {
    const batch = await producer.createBatch();

    const event: EventData = {
      body: message,
    };

    batch.tryAdd(event);

    await producer.sendBatch(batch);
    await producer.close();
  };

  const messageQueueService = {
    sendMessage,
  };
  return messageQueueService;
};
