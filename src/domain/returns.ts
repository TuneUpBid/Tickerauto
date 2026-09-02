export interface CashFlow {
  date: Date;
  amount: number;
}

function yearFraction(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

export function timeWeightedReturn(
  points: { date: Date; value: number; externalFlow?: number }[],
): {
  twr: number | null;
  explanation: string;
} {
  if (points.length < 2) {
    return {
      twr: null,
      explanation:
        "Time-weighted return requires at least two valuation observations. Insufficient verified data.",
    };
  }
  const ordered = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  let product = 1;
  let linked = 0;
  for (let i = 1; i < ordered.length; i += 1) {
    const start = ordered[i - 1].value;
    const flow = ordered[i].externalFlow ?? 0;
    const end = ordered[i].value;
    if (start === 0) {
      continue;
    }
    product *= 1 + (end - flow - start) / start;
    linked += 1;
  }
  if (!linked) {
    return {
      twr: null,
      explanation: "Time-weighted return could not be linked because a sub-period began at zero.",
    };
  }
  return {
    twr: product - 1,
    explanation:
      "Time-weighted return geometrically links sub-period returns between cash-flow dates so that the timing of deposits and withdrawals does not dominate the result.",
  };
}

function npv(rate: number, flows: CashFlow[], start: Date): number {
  return flows.reduce((acc, flow) => {
    const t = yearFraction(start, flow.date);
    return acc + flow.amount / (1 + rate) ** t;
  }, 0);
}

export function moneyWeightedReturn(flows: CashFlow[]): {
  mwr: number | null;
  explanation: string;
} {
  if (flows.length < 2) {
    return {
      mwr: null,
      explanation:
        "Money-weighted return requires at least two cash flows. Insufficient verified data.",
    };
  }
  const ordered = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = ordered[0].date;
  let low = -0.999;
  let high = 10;
  const startNpv = npv(0, ordered, start);
  if (Math.abs(startNpv) < 1e-9) {
    return {
      mwr: 0,
      explanation:
        "Money-weighted return is the internal rate of return of the actual cash flows, including purchases, expenses, sales, and ending value.",
    };
  }
  let lowNpv = npv(low, ordered, start);
  let highNpv = npv(high, ordered, start);
  if (lowNpv * highNpv > 0) {
    return {
      mwr: null,
      explanation:
        "Money-weighted return could not be solved for this cash-flow set. The result is not invented.",
    };
  }
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid, ordered, start);
    if (Math.abs(midNpv) < 1e-7) {
      return {
        mwr: mid,
        explanation:
          "Money-weighted return is the internal rate of return of the actual cash flows, including purchases, expenses, sales, and ending value.",
      };
    }
    if (lowNpv * midNpv <= 0) {
      high = mid;
      highNpv = midNpv;
    } else {
      low = mid;
      lowNpv = midNpv;
    }
  }
  return {
    mwr: (low + high) / 2,
    explanation:
      "Money-weighted return is the internal rate of return of the actual cash flows, including purchases, expenses, sales, and ending value.",
  };
}

export function periodReturn(start: number | null, end: number | null): number | null {
  if (start === null || end === null || start === 0) return null;
  return (end - start) / start;
}
