import {
    CreateBatchOptions,
    EventData,
    EventHubProducerClient,
  } from "@azure/event-hubs";
import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
  import { Message } from "@zero-tech/zns-message-schemas";
  import { MessageQueueService } from "..";
  
  export const create = (
    connectionString: string,
    destinationName: string
  ): MessageQueueService => {
    const sendMessage = async (message: ServiceBusMessage) => {
      const sbMessage: ServiceBusMessage = {
        body: message
      }
      const sbClient: ServiceBusClient = new ServiceBusClient(connectionString);
      const sender = sbClient.createSender(destinationName);

      await sender.sendMessages(sbMessage)

      await sender.close();
    };
  
    const sendMessagesBatch = async (
      messages: Message[],
      batchOptions: CreateBatchOptions | undefined
    ) => {
      throw new Error("Method not implemented")
    };
  
    const messageQueueService: MessageQueueService = {
      sendMessage,
      sendMessagesBatch,
    };
    return messageQueueService;
  };
  