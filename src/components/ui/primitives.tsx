import { cn } from "@/lib/utils";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-line bg-bg-elevated rounded-2xl border p-5 shadow-[0_1px_0_rgba(27,23,18,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-accent text-accent-ink hover:opacity-90",
    secondary: "border border-line bg-bg-elevated text-ink hover:bg-bg-muted",
    danger: "bg-down text-white hover:opacity-90",
    ghost: "text-ink hover:bg-bg-muted",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-line bg-bg-elevated text-ink placeholder:text-muted w-full rounded-xl border px-3 py-2 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-line bg-bg-elevated text-ink placeholder:text-muted w-full rounded-xl border px-3 py-2 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-muted mb-1 block text-xs font-medium tracking-wide uppercase", className)}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Alert({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "warn" | "down" | "up";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-line bg-bg-muted",
    warn: "border-warn/40 bg-warn/10",
    down: "border-down/40 bg-down/10",
    up: "border-up/40 bg-up/10",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])} role="status">
      {title ? <p className="font-medium">{title}</p> : null}
      <div className="text-muted">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "up" | "down" | "warn";
}) {
  const tones = {
    neutral: "bg-bg-muted text-ink",
    up: "bg-up/15 text-up",
    down: "bg-down/15 text-down",
    warn: "bg-warn/15 text-warn",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-line rounded-2xl border border-dashed px-6 py-12 text-center">
      <h3 className="display text-lg">{title}</h3>
      <div className="text-muted mt-2 text-sm">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  direction,
}: {
  label: string;
  value: string;
  hint?: string;
  direction?: "up" | "down" | "flat";
}) {
  return (
    <Card>
      <p className="text-muted text-xs tracking-wide uppercase">{label}</p>
      <p
        className={cn(
          "tabular mt-2 text-2xl",
          direction === "up" && "text-up",
          direction === "down" && "text-down",
        )}
      >
        {direction === "up" ? "▲ " : direction === "down" ? "▼ " : ""}
        {value}
      </p>
      {hint ? <p className="text-muted mt-1 text-xs">{hint}</p> : null}
    </Card>
  );
}
