import { BidFilterStatus } from "../types";

export function getBidFilterStatus(input : string | undefined): BidFilterStatus {
    input = input ?? "";
    return BidFilterStatus[input.toLowerCase() as 
        keyof typeof BidFilterStatus] ?? BidFilterStatus.active;
  }