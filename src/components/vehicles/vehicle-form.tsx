"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createVehicleAction, decodeVinAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";
type DecodedFields = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  series: string | null;
  bodyStyle: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
};

function describeDecoded(decoded: DecodedFields) {
  return [decoded.year, decoded.make, decoded.model, decoded.trim, decoded.engine, decoded.bodyStyle]
    .filter(Boolean)
    .join(" · ");
}

function keep(current: string, next: string | number | null | undefined) {
  if (current.trim()) return current;
  if (next === null || next === undefined || next === "") return current;
  return String(next);
}

export function VehicleCreateForm({ collectionId }: { collectionId: string }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(createVehicleAction, null);
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [generation, setGeneration] = useState("");
  const [series, setSeries] = useState("");
  const [trim, setTrim] = useState("");
  const [bodyStyle, setBodyStyle] = useState("");
  const [engine, setEngine] = useState("");
  const [transmission, setTransmission] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [decodeNote, setDecodeNote] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const lastAttempted = useRef<string | null>(null);

  const resolvedCollectionId = collectionId || params.get("collectionId") || "";

  function applyDecoded(decoded: DecodedFields, summary?: string) {
    setYear((value) => keep(value, decoded.year));
    setMake((value) => keep(value, decoded.make));
    setModel((value) => keep(value, decoded.model));
    setGeneration((value) => keep(value, decoded.series));
    setSeries((value) => keep(value, decoded.series));
    setTrim((value) => keep(value, decoded.trim));
    setBodyStyle((value) => keep(value, decoded.bodyStyle));
    setEngine((value) => keep(value, decoded.engine));
    setTransmission((value) => keep(value, decoded.transmission));
    setDrivetrain((value) => keep(value, decoded.drivetrain));
    setDecodeNote(summary ? `${summary} ${describeDecoded(decoded)}` : describeDecoded(decoded));
    setDecodeError(null);
  }

  async function decode(currentVin: string) {
    const cleaned = currentVin.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length !== 17) {
      setDecodeError("Enter a 17-character VIN to decode. Shorter chassis numbers are stored as entered.");
      return;
    }
    lastAttempted.current = cleaned;
    setDecoding(true);
    const result = await decodeVinAction(cleaned);
    setDecoding(false);
    if (result.decoded) {
      applyDecoded(result.decoded, result.summary);
      return;
    }
    setDecodeError(result.error ?? "VIN could not be decoded.");
  }

  useEffect(() => {
    const cleaned = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length !== 17 || lastAttempted.current === cleaned) return;
    void decode(cleaned);
  }, [vin]);

  return (
    <form action={action} className="mt-6 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="collectionId" value={resolvedCollectionId} />
      <div className="md:col-span-2">
        <Field label="VIN">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="vin"
              value={vin}
              autoComplete="off"
              spellCheck={false}
              placeholder="17-character VIN"
              onChange={(event) => setVin(event.target.value.toUpperCase())}
            />
            <Button type="button" variant="secondary" disabled={decoding} onClick={() => void decode(vin)}>
              {decoding ? "Decoding…" : "Fill from VIN"}
            </Button>
          </div>
        </Field>
        {decodeNote ? <p className="text-muted mt-2 text-sm">{decodeNote}</p> : null}
        {decodeError ? <p className="text-down mt-2 text-sm">{decodeError}</p> : null}
        <p className="text-muted mt-2 text-xs">
          NHTSA fills year, make, model, trim, body, engine, and drivetrain when those fields are
          known. Market values still require completed sales and are never invented.
        </p>
      </div>
      <Field label="Chassis number">
        <Input name="chassisNumber" />
      </Field>
      <Field label="Year">
        <Input name="year" type="number" value={year} onChange={(event) => setYear(event.target.value)} />
      </Field>
      <Field label="Make">
        <Input name="make" value={make} onChange={(event) => setMake(event.target.value)} />
      </Field>
      <Field label="Model">
        <Input name="model" value={model} onChange={(event) => setModel(event.target.value)} />
      </Field>
      <Field label="Generation">
        <Input
          name="generation"
          value={generation}
          onChange={(event) => setGeneration(event.target.value)}
        />
      </Field>
      <Field label="Series">
        <Input name="series" value={series} onChange={(event) => setSeries(event.target.value)} />
      </Field>
      <Field label="Trim">
        <Input name="trim" value={trim} onChange={(event) => setTrim(event.target.value)} />
      </Field>
      <Field label="Body style">
        <Input
          name="bodyStyle"
          value={bodyStyle}
          onChange={(event) => setBodyStyle(event.target.value)}
        />
      </Field>
      <Field label="Engine">
        <Input name="engine" value={engine} onChange={(event) => setEngine(event.target.value)} />
      </Field>
      <Field label="Transmission">
        <Input
          name="transmission"
          value={transmission}
          onChange={(event) => setTransmission(event.target.value)}
        />
      </Field>
      <Field label="Drivetrain">
        <Input
          name="drivetrain"
          value={drivetrain}
          onChange={(event) => setDrivetrain(event.target.value)}
        />
      </Field>
      <Field label="Exterior color">
        <Input name="exteriorColor" />
      </Field>
      <Field label="Interior color">
        <Input name="interiorColor" />
      </Field>
      <Field label="Mileage">
        <Input name="currentMileage" type="number" />
      </Field>
      <Field label="Mileage unit">
        <Input name="mileageUnit" defaultValue="MI" />
      </Field>
      <Field label="Condition grade">
        <Input name="conditionGrade" />
      </Field>
      <Field label="Title status">
        <Input name="titleStatus" defaultValue="UNKNOWN" />
      </Field>
      <Field label="Storage location (private)">
        <Input name="storageLocation" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Factory options (comma or newline)">
          <Textarea name="factoryOptions" rows={2} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Modifications">
          <Textarea name="modifications" rows={2} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Restoration history">
          <Textarea name="restorationHistory" rows={3} />
        </Field>
      </div>
      <FormStatus error={state?.error} />
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save vehicle"}
        </Button>
      </div>
    </form>
  );
}
