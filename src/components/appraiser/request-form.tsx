"use client";

import { useActionState, useState } from "react";
import { requestAppraisalAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

const PRESETS = {
  LENDING_COLLATERAL: {
    intendedUse: "Collateral valuation for a proposed secured loan",
    intendedUsers: "Vehicle owner and authorized lender credit staff",
    valueType: "FAIR_MARKET",
    scope:
      "Review collector evidence, inspect or remotely document the subject, analyze completed comparable sales, and produce a signed personal-property appraisal for the named lender's credit file. Software drafts are not the appraisal.",
  },
  NET_WORTH: {
    intendedUse: "Fair-market opinion for a personal financial statement",
    intendedUsers: "Vehicle owner and authorized wealth or tax advisors",
    valueType: "FAIR_MARKET",
    scope:
      "Review collector evidence, inspect or remotely document the subject, analyze completed comparable sales, and produce a signed personal-property appraisal for net-worth reporting. This is not an insurance agreed value and not a liquidation value.",
  },
  INTERNAL_MONITORING: {
    intendedUse: "Internal collection monitoring",
    intendedUsers: "Collector of record",
    valueType: "FAIR_MARKET",
    scope:
      "Review collector evidence and completed comparable sales for internal monitoring. This engagement is not prepared for a loan file.",
  },
} as const;

export function AppraisalRequestForm({
  collectionId,
  vehicleId,
  valuationId,
}: {
  collectionId: string;
  vehicleId: string;
  valuationId?: string;
}) {
  const [state, action, pending] = useActionState(requestAppraisalAction, null);
  const [kind, setKind] = useState<keyof typeof PRESETS>("LENDING_COLLATERAL");
  const preset = PRESETS[kind];
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {valuationId ? <input type="hidden" name="valuationId" value={valuationId} /> : null}
      <Field label="Engagement">
        <select
          name="engagementKind"
          value={kind}
          onChange={(event) => setKind(event.target.value as keyof typeof PRESETS)}
          className="border-line bg-bg text-ink min-h-11 w-full rounded-xl border px-3"
        >
          <option value="LENDING_COLLATERAL">Lending / collateral</option>
          <option value="NET_WORTH">Net worth / personal financial statement</option>
          <option value="INTERNAL_MONITORING">Internal monitoring only</option>
        </select>
      </Field>
      <Field label="Definition of value">
        <select
          name="valueType"
          defaultValue={preset.valueType}
          key={`${kind}-value`}
          className="border-line bg-bg text-ink min-h-11 w-full rounded-xl border px-3"
        >
          <option value="FAIR_MARKET">Fair market</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="ORDERLY_LIQUIDATION">Orderly liquidation</option>
          <option value="RETAIL_MARKET">Retail market</option>
        </select>
      </Field>
      <Field label="Intended use">
        <Input name="intendedUse" required key={`${kind}-use`} defaultValue={preset.intendedUse} />
      </Field>
      <Field label="Intended users">
        <Input
          name="intendedUsers"
          required
          key={`${kind}-users`}
          defaultValue={preset.intendedUsers}
        />
      </Field>
      <Field label="Effective date">
        <Input name="effectiveOn" type="date" required />
      </Field>
      <Field label="Scope of work">
        <Textarea name="scopeOfWork" required key={`${kind}-scope`} defaultValue={preset.scope} />
      </Field>
      <p className="text-muted text-xs">
        Software can assemble the workfile. A disinterested appraiser with a verified value
        designation still has to inspect and sign. A California Vehicle Verifier cannot sign the
        number.
      </p>
      <FormStatus error={state?.error} />
      <Button type="submit" disabled={pending}>
        Request appraisal
      </Button>
    </form>
  );
}
