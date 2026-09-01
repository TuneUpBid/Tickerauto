import { prisma } from "../src/server/db";
import { applyVinDecodeToVehicle } from "../src/server/services/vehicles";
import { correlationId } from "../src/lib/utils";

async function main() {
  const user = await prisma.user.findFirst({
    where: { memberships: { some: { status: "ACTIVE" } } },
    include: { memberships: { include: { organization: true } } },
  });
  if (!user) throw new Error("No user available to apply VIN decode.");

  const vehicles = await prisma.vehicle.findMany({
    where: { vin: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  for (const vehicle of vehicles) {
    const vin = vehicle.vin?.replace(/[^A-Za-z0-9]/g, "") ?? "";
    if (vin.length !== 17) {
      console.log(`skip ${vehicle.year} ${vehicle.make} ${vehicle.model}: VIN is not 17 characters`);
      continue;
    }
    const result = await applyVinDecodeToVehicle(user, vehicle.id, correlationId(), {
      developValuation: true,
    });
    if (!result.decoded.ok) {
      console.log(`decode failed ${vin}: ${result.decoded.reason}`);
      continue;
    }
    console.log(
      `filled ${result.vehicle.year} ${result.vehicle.make} ${result.vehicle.model} · ${result.vehicle.trim ?? "no trim"} · ${result.vehicle.engine ?? "no engine"}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
