import { AppShell } from "@/components/layout/shell";
import { Alert, Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { UploadForm } from "@/components/vehicles/upload-form";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!vehicle) return <AppShell user={user}>Vehicle not found.</AppShell>;
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Document vault</h1>
      <div className="mt-4">
        <Alert tone="warn" title="Sensitive documents">
          Title, ownership, and location records remain private unless a report is explicitly
          shared. Malware scanning is{" "}
          {vehicle.documents.some((doc) => doc.malwareScanStatus !== "not_configured")
            ? "configured"
            : "not configured — uploads are stored privately but not scanned by an external vendor"}
          .
        </Alert>
      </div>
      <Card className="mt-6">
        <UploadForm vehicleId={id} />
        <ul className="mt-6 space-y-3 text-sm">
          {vehicle.documents.map((doc) => (
            <li key={doc.id} className="border-line flex justify-between gap-4 border-t pt-3">
              <div>
                <p>{doc.fileName}</p>
                <p className="text-muted text-xs">
                  {doc.kind} · {doc.sensitivity} · SHA-256 {doc.sha256.slice(0, 12)}… · scan{" "}
                  {doc.malwareScanStatus} · {formatDate(doc.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
