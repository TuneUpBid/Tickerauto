import { add, money, subtract, type Money } from "./money";

export interface PnlInputs {
  currency: string;
  acquisitionPrice: Money;
  buyerFees: Money;
  transportation: Money;
  taxes: Money;
  capitalImprovements: Money;
  maintenance: Money;
  insurance: Money;
  otherOperating: Money;
  currentEstimatedValue: Money | null;
  realizedProceeds: Money | null;
  sellingFees: Money;
}

export interface PnlResult {
  acquisitionPrice: Money;
  initialTransactionCosts: Money;
  costBasis: Money;
  capitalImprovements: Money;
  operatingAndMaintenance: Money;
  currentEstimatedValue: Money | null;
  unrealizedGainLoss: Money | null;
  realizedProceeds: Money | null;
  sellingFees: Money;
  realizedGainLoss: Money | null;
  grossAppreciation: Money | null;
  netEconomicReturn: Money | null;
  labels: {
    unrealized: string;
    realized: string;
    grossAppreciation: string;
    netEconomicReturn: string;
  };
}

export function calculatePnl(input: PnlInputs): PnlResult {
  const initialTransactionCosts = add(add(input.buyerFees, input.transportation), input.taxes);
  const costBasis = add(
    add(input.acquisitionPrice, initialTransactionCosts),
    input.capitalImprovements,
  );
  const operatingAndMaintenance = add(
    add(input.maintenance, input.insurance),
    input.otherOperating,
  );

  const terminal = input.realizedProceeds ?? input.currentEstimatedValue;
  const unrealizedGainLoss =
    input.realizedProceeds === null && input.currentEstimatedValue
      ? subtract(input.currentEstimatedValue, costBasis)
      : input.realizedProceeds === null
        ? null
        : null;
  const realizedGainLoss = input.realizedProceeds
    ? subtract(subtract(input.realizedProceeds, input.sellingFees), costBasis)
    : null;
  const grossAppreciation = terminal ? subtract(terminal, input.acquisitionPrice) : null;
  const netEconomicReturn = terminal
    ? subtract(subtract(subtract(terminal, costBasis), operatingAndMaintenance), input.sellingFees)
    : null;

  return {
    acquisitionPrice: input.acquisitionPrice,
    initialTransactionCosts,
    costBasis,
    capitalImprovements: input.capitalImprovements,
    operatingAndMaintenance,
    currentEstimatedValue: input.currentEstimatedValue,
    unrealizedGainLoss,
    realizedProceeds: input.realizedProceeds,
    sellingFees: input.sellingFees,
    realizedGainLoss,
    grossAppreciation,
    netEconomicReturn,
    labels: {
      unrealized: "Unrealized gain/loss versus cost basis",
      realized: "Realized gain/loss after selling fees versus cost basis",
      grossAppreciation:
        "Gross appreciation versus acquisition price. This is not profit because ownership expenses are excluded.",
      netEconomicReturn:
        "Net economic return after cost basis, operating expenses, and selling fees. This is not labeled profit unless all material expenses are included.",
    },
  };
}

export function emptyPnl(currency = "USD"): PnlInputs {
  const zero = money(0, currency);
  return {
    currency,
    acquisitionPrice: zero,
    buyerFees: zero,
    transportation: zero,
    taxes: zero,
    capitalImprovements: zero,
    maintenance: zero,
    insurance: zero,
    otherOperating: zero,
    currentEstimatedValue: null,
    realizedProceeds: null,
    sellingFees: zero,
  };
}
