import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function AuthBrand() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href="/" className="display text-2xl">
        MotorLedger
      </Link>
      <ThemeToggle compact />
    </div>
  );
}
