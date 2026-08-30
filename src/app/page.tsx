import Link from "next/link";

export default function HomePage() {
  return (
    <div className="bg-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <p className="display text-2xl">MotorLedger</p>
        <div className="flex gap-3 text-sm">
          <Link href="/login" className="border-line rounded-full border px-4 py-2">
            Sign in
          </Link>
          <Link href="/register" className="bg-accent text-accent-ink rounded-full px-4 py-2">
            Create account
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="grid gap-10 py-16 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="text-muted text-xs tracking-[0.2em] uppercase">
              Private collection ledgers
            </p>
            <h1 className="display mt-4 text-5xl leading-tight md:text-6xl">
              Evidence-backed values for cars that are not ticker symbols.
            </h1>
            <p className="text-muted mt-6 max-w-xl text-lg">
              Track acquisition cost, source-linked comparable sales, draft valuations, independent
              appraisals, and lender-facing collateral packages — without inventing a market.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="bg-accent text-accent-ink rounded-full px-5 py-3">
                Open a ledger
              </Link>
              <Link href="/legal/disclosures" className="border-line rounded-full border px-5 py-3">
                Read disclosures
              </Link>
            </div>
          </div>
          <aside className="border-line bg-bg-elevated rounded-3xl border p-6">
            <p className="text-muted text-xs tracking-wide uppercase">What a number must have</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>Completed transactions or a signed appraisal</li>
              <li>A documented, versioned methodology</li>
              <li>Provenance for every comparable</li>
              <li>An honest insufficient-data state when evidence is missing</li>
            </ul>
          </aside>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Portfolio",
              body: "Acquisition cost, cost basis, unrealized and realized results, and snapshots — not interpolated daily charts.",
            },
            {
              title: "Valuation",
              body: "Comparable sales with inclusion reasons, adjustments, and exclusions. No LLM-authored prices.",
            },
            {
              title: "Lender package",
              body: "Versioned reports with a content hash, verification URL, and explicit lender acceptance — never inferred.",
            },
          ].map((item) => (
            <article key={item.title} className="border-line bg-bg-elevated rounded-2xl border p-5">
              <h2 className="display text-2xl">{item.title}</h2>
              <p className="text-muted mt-2 text-sm">{item.body}</p>
            </article>
          ))}
        </section>
        <p className="text-muted mt-12 max-w-3xl text-sm">
          MotorLedger does not make lending decisions. Market estimates are opinions based on
          available evidence. A valuation becomes an appraisal only after a qualified independent
          appraiser completes and signs it.
        </p>
      </main>
    </div>
  );
}
