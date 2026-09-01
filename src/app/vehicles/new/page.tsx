import { Suspense } from "react";
import { AppShell } from "@/components/layout/shell";
import { VehicleCreateForm } from "@/components/vehicles/vehicle-form";
import { requireUser } from "@/server/auth/require";

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ collectionId?: string }>;
}) {
  const user = await requireUser();
  const { collectionId } = await searchParams;
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Add vehicle</h1>
      <p className="text-muted mt-2 text-sm">
        Enter a VIN to fill identity fields from NHTSA. Title and storage location stay private
        unless you share a report.
      </p>
      <Suspense>
        <VehicleCreateForm collectionId={collectionId ?? ""} />
      </Suspense>
    </AppShell>
  );
}
