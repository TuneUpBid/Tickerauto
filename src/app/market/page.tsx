import { AppShell } from "@/components/layout/shell";
import { Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ make?: string; model?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const transactions = await prisma.marketTransaction.findMany({
    where: {
      ...(params.make ? { make: { equals: params.make, mode: "insensitive" } } : {}),
      ...(params.model ? { model: { equals: params.model, mode: "insensitive" } } : {}),
    },
    orderBy: { auctionEndAt: "desc" },
    take: 50,
  });
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Comparables explorer</h1>
      <p className="text-muted mt-2 text-sm">
        Only stored, source-linked records are shown. Asking prices and live bids are labeled and
        never treated as sold.
      </p>
      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="make"
          defaultValue={params.make}
          placeholder="Make"
          className="border-line rounded-xl border px-3 py-2"
        />
        <input
          name="model"
          defaultValue={params.model}
          placeholder="Model"
          className="border-line rounded-xl border px-3 py-2"
        />
        <button className="bg-accent text-accent-ink rounded-full px-4 py-2" type="submit">
          Filter
        </button>
      </form>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted text-xs uppercase">
            <tr>
              <th className="py-2">When</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-line border-t">
                <td className="py-2">{formatDate(tx.auctionEndAt)}</td>
                <td>
                  {tx.year} {tx.make} {tx.model}
                </td>
                <td>{tx.saleStatus.replaceAll("_", " ")}</td>
                <td className="tabular">
                  {tx.normalizedUsdMinor
                    ? formatMoney({ amountMinor: tx.normalizedUsdMinor, currency: "USD" })
                    : tx.originalAmountMinor
                      ? formatMoney({ amountMinor: tx.originalAmountMinor, currency: tx.currency })
                      : "Insufficient verified data"}
                </td>
                <td>
                  {tx.sourceUrl ? (
                    <a href={tx.sourceUrl} className="underline" target="_blank" rel="noreferrer">
                      {tx.source}
                    </a>
                  ) : (
                    tx.source
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
