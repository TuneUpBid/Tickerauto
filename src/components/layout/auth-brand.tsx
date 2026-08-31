import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

export function AuthBrand() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Wordmark />
      <ThemeToggle compact />
    </div>
  );
}
