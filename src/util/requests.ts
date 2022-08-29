import { BidFilterStatus } from "../types";

export function getBidFilterStatus(input: string | undefined): BidFilterStatus {
  const filter = input ?? "";
  return (
    BidFilterStatus[filter.toLowerCase() as keyof typeof BidFilterStatus] ??
    BidFilterStatus.active
  );
}
