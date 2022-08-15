import { Document, Filter } from "mongodb";
import { BidFilterStatus } from "../../types";

export function addFilterByBidStatus(
  query: Filter<Document>,
  bidStatus: BidFilterStatus
): Filter<Document> {
  switch (bidStatus) {
    case BidFilterStatus.cancelled: {
      query.$or = [{ cancelDate: { $gte: 1 } }];
      break;
    }
    case BidFilterStatus.active: {
      query.$or = [
        { cancelDate: { $lt: 1 } },
        { cancelDate: { $exists: false } },
      ];
      break;
    }
    default: {
      break;
    }
  }
  return query;
}
