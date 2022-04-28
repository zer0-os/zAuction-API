import { InsertOneResult, Document, InsertManyResult, Filter } from "mongodb";
import { BidDatabaseService } from "..";
import { Bid, BidFilterStatus, CancelledBid, CancelableBid } from "../../types";
import * as mongo from "../backends/mongo";
import { addFilterByBidStatus } from "../helpers/dynamicQueryBuilder";
import { UncertainBid } from "../types";

const uncertainBidToBid = (bid: UncertainBid): CancelableBid => {
  const properBid: CancelableBid = {
    ...bid,
    version: bid.version ?? "1.0",
    bidNonce: bid.bidNonce ?? bid.auctionId,
  };

  //Strip signed message if bid has been cancelled
  if (properBid.cancelDate && properBid.cancelDate > 0)
  {
    properBid.signedMessage = "";
  }
  return properBid;
};

const mapBids = (bids: UncertainBid[]): CancelableBid[] => bids.map(uncertainBidToBid);

export const create = (db: string, collection: string): BidDatabaseService => {
  const database = db;
  const usedCollection = collection;

  const insertBid = async (data: Bid): Promise<boolean> => {
    const result: InsertOneResult<Document> = await mongo.insertOne(
      data,
      database,
      usedCollection
    );

    return result.acknowledged;
  };

  const insertBids = async (data: Bid[]): Promise<boolean> => {
    const result: InsertManyResult<Document> = await mongo.insertMany(
      data,
      database,
      usedCollection
    );

    return result.acknowledged;
  };

  const getBidsByTokenIds = async (tokenIds: string[]): Promise<Bid[]> => {
    const tokenIdList = [...tokenIds];
    const versionlessResult: UncertainBid[] = await mongo.find(
      database,
      usedCollection,
      {
        tokenId: {
          $in: tokenIdList,
        },
      }
    );

    const result: Bid[] = mapBids(versionlessResult);
    return result;
  };

  const getBidsByAccount = async (account: string, bidStatus: BidFilterStatus): Promise<CancelableBid[]> => {
    let queryWrapper : Filter<Document> = {
      account: `${account}`,
    }
    addFilterByBidStatus(queryWrapper, bidStatus);    
    const maybeResult: UncertainBid[] = await mongo.find(
      database,
      usedCollection,
      queryWrapper
    );

    const result: CancelableBid[] = mapBids(maybeResult);
    return result;
  };

  const getBidBySignedMessage = async (
    signedMessage: string
  ): Promise<Bid | null> => {
    const maybeResult: UncertainBid | null = await mongo.findOne(
      database,
      collection,
      {
        signedMessage: `${signedMessage}`,
      }
    );

    if (!maybeResult) {
      return null;
    }

    const bid = uncertainBidToBid(maybeResult);
    return bid;
  };

  const cancelBid = async (
    bid: CancelledBid,
    archiveCollection: string
  ): Promise<boolean> => {

    // Place bid into archive collection, then delete
    const insertResult: InsertOneResult = await mongo.insertOne(
      bid,
      database,
      archiveCollection
    );

    if (!insertResult.acknowledged) {
      throw Error(
        `Failed to cancel bid with signed message: ${bid.signedMessage}`
      );
    }

    const result: boolean = await mongo.deleteOne(database, usedCollection, {
      signedMessage: `${bid.signedMessage}`,
    });
    return result;
  };

  const databaseService = {
    insertBid,
    insertBids,
    getBidsByTokenIds,
    getBidsByAccount,
    getBidBySignedMessage,
    cancelBid,
  };

  return databaseService;
};
