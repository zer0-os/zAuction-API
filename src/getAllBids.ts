import * as env from "env-var";
require("dotenv").config()

import { adapters, BidDatabaseService } from "./database";
import {Bid} from "./types"


const findDuplicates = async () => {

  const db = env.get("MONGO_DB").required().asString();

  // Collection is mainnet bids
  const database: BidDatabaseService = adapters.mongo.create(db, "bids");
  const bids: Bid[] = await database.getAllBids("bids");
  
  const duplicates: Bid[] = [];
  const haveSeen = new Map<string, boolean>();

  for (const bid of bids) {
    // Some bids have both `auctionId` and `bidNonce`, but they are always the same
    const setValue = bid.auctionId ?? bid.bidNonce;

    // This case is never reached because they are never unequal
    if (bid.auctionId && bid.bidNonce && bid.auctionId !== bid.bidNonce) {
      console.log(`auctionId: ${bid.auctionId}`);
      console.log(`bidNonce:  ${bid.bidNonce}`);
    }

    // Mark new items as seen, and add already seen items to `duplicates` array
    if (haveSeen.get(setValue)) {
      duplicates.push(bid);
    } else {
      haveSeen.set(setValue, true);
    }
  }

  console.log(duplicates.length);

  // Cancel or delete bids?
  // for (const dup of duplicates) {
  //   dup.cancelDate = Date.now(); 
  //   await database.cancelBid(dup, "bids");
  // }
}

findDuplicates();