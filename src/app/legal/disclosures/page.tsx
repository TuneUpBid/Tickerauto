import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Wordmark } from "@/components/layout/wordmark";

export default function DisclosuresPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <Wordmark />
        <ThemeToggle compact />
      </div>
      <h1 className="display mt-6 text-4xl">Disclosures</h1>
      <ul className="text-muted mt-8 space-y-4 text-sm leading-7">
        <li>
          Market estimates are opinions based on available completed-sale evidence and recorded
          vehicle characteristics.
        </li>
        <li>Past appreciation does not guarantee future appreciation.</li>
        <li>Asking prices and active bids are not completed-sale evidence.</li>
        <li>Reserve-not-met results are not sold prices.</li>
        <li>Appraisals may expire as markets and vehicle conditions change.</li>
        <li>Lenders independently determine collateral eligibility and loan-to-value.</li>
        <li>The platform does not itself make lending decisions.</li>
        <li>
          USPAP compatibility describes workflow structure. It does not by itself make a report
          compliant.
        </li>
        <li>
          Legal and appraisal professionals must approve production report language before client or
          lender use.
        </li>
        <li>
          No figure shown by this software is guaranteed, 100% accurate, bank approved, or USPAP
          certified unless an independent appraiser and, separately, a lender have taken those
          explicit actions.
        </li>
      </ul>
    </main>
  );
}
