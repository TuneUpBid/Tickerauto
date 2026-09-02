import { readFileSync } from "node:fs";
import { importAuthorizedJson } from "../src/server/services/market";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/import-authorized-market-json.ts <file.json>");
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(file, "utf8"));
  const result = await importAuthorizedJson(payload, null, `cli:${file}`);
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
