import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Wordmark } from "@/components/layout/wordmark";

const requirements = [
  ["01", "A completed sale or a signed appraisal"],
  ["02", "A documented, versioned methodology"],
  ["03", "Provenance for every comparable"],
  ["04", "Insufficient verified data when evidence is missing"],
];

const sections = [
  {
    index: "01",
    title: "Portfolio",
    body: "Acquisition cost, cost basis, unrealized and realized results, stored snapshots. Gaps stay visible.",
  },
  {
    index: "02",
    title: "Valuation",
    body: "Comparable sales with inclusion reasons, adjustments, and exclusions. No invented prices.",
  },
  {
    index: "03",
    title: "Lender package",
    body: "Versioned reports with a content hash, a verification URL, and an explicit accept or reject.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Wordmark />
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <ThemeToggle compact />
          <Link href="/login" className="border-line inline-flex min-h-11 items-center border px-3">
            Sign in
          </Link>
          <Link
            href="/register"
            className="bg-accent text-accent-ink inline-flex min-h-11 items-center px-3"
          >
            Open a ledger
          </Link>
        </div>
      </header>
      <div className="rule" />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <p className="kicker pt-10">Private collection ledger · no mark-to-market</p>
        <section className="mt-6 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1 className="display text-4xl leading-[1.1] sm:text-5xl">
              A ledger of cost and evidence.
              <br />
              Not a ticker.
            </h1>
            <p className="text-muted mt-6 max-w-lg text-base leading-7">
              Record what you paid. Attach source-linked completed sales. Draft a figure only when
              the comps support it. An appraisal exists only after a qualified independent appraiser
              signs.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/register"
                className="bg-accent text-accent-ink inline-flex min-h-11 items-center px-4"
              >
                Create an account
              </Link>
              <Link
                href="/legal/disclosures"
                className="border-line inline-flex min-h-11 items-center border px-4"
              >
                Disclosures
              </Link>
            </div>
          </div>
          <dl className="lg:col-span-5">
            <dt className="kicker">A number is allowed only if</dt>
            <div className="mt-4">
              {requirements.map(([index, text]) => (
                <div key={index} className="rule grid grid-cols-[2.5rem_1fr] gap-3 py-3 text-sm">
                  <dt className="tabular text-muted">{index}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
              <div className="rule" />
            </div>
          </dl>
        </section>
        <section className="mt-16">
          <div className="rule" />
          {sections.map((item) => (
            <article
              key={item.title}
              className="rule grid gap-2 py-6 sm:grid-cols-[4rem_10rem_1fr] sm:items-baseline"
            >
              <p className="tabular text-muted text-sm">{item.index}</p>
              <h2 className="display text-xl">{item.title}</h2>
              <p className="text-muted text-sm leading-6">{item.body}</p>
            </article>
          ))}
          <div className="rule" />
        </section>
        <p className="text-muted mt-10 max-w-2xl text-sm leading-6">
          MotorLedger does not make lending decisions. Market estimates are opinions from available
          completed-sale evidence. A valuation becomes an appraisal only after a qualified
          independent appraiser completes and signs it.
        </p>
      </main>
    </div>
  );
}
