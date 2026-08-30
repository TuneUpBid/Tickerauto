export type CanonicalSaleStatus =
  "sold" | "reserve_not_met" | "result_unavailable" | "canceled" | "withdrawn" | "live" | "asking";

export function canonicalizeSaleStatus(raw: string | null | undefined): CanonicalSaleStatus | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "sold" || value === "completed" || value === "sold!") return "sold";
  if (value === "reserve not met" || value === "reserve_not_met" || value === "rnm") {
    return "reserve_not_met";
  }
  if (value === "result unavailable" || value === "result_unavailable") return "result_unavailable";
  if (value === "canceled" || value === "cancelled") return "canceled";
  if (value === "withdrawn") return "withdrawn";
  if (value === "live" || value === "active" || value === "in progress") return "live";
  if (value === "asking" || value === "listed" || value === "buy now") return "asking";
  return null;
}

export function isCompletedSale(status: CanonicalSaleStatus): boolean {
  return status === "sold";
}

export function exclusionReasonForStatus(status: CanonicalSaleStatus): string | null {
  switch (status) {
    case "sold":
      return null;
    case "reserve_not_met":
      return "Reserve-not-met results are not completed sales and cannot be used as sold prices.";
    case "live":
      return "Current bids and in-progress auctions are not completed-sale evidence.";
    case "asking":
      return "Asking prices are not completed-sale evidence.";
    case "result_unavailable":
      return "Sale result is unavailable from the source and is not treated as a completed sale.";
    case "canceled":
      return "Canceled auctions are not completed sales.";
    case "withdrawn":
      return "Withdrawn listings are not completed sales.";
  }
}
