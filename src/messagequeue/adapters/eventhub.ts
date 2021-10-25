import { EventData, EventHubProducerClient } from "@azure/event-hubs"
import { BidCancelledMessage, BidPlacedMessage } from "../../types";

export const create = (connectionString: string, name: string) => {
    const producer: EventHubProducerClient = new EventHubProducerClient(connectionString, name);

    const sendMessage = async (message: (BidPlacedMessage | BidCancelledMessage)) => {
        const batch = await producer.createBatch();

        const event: EventData = {
            body: message.event,
            properties: {
                ...message.data,
                timestamp: message.timestamp
            }
        }

        batch.tryAdd(event);

        await producer.sendBatch(batch);
        await producer.close();
    }

    const messageQueueService = {
        sendMessage,
    }
    return messageQueueService
}