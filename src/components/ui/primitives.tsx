import { cn } from "@/lib/utils";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-line bg-bg border p-4", className)} {...props} />
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
    secondary: "border border-line bg-bg text-ink hover:bg-bg-muted",
    danger: "bg-down text-white hover:opacity-90",
    ghost: "text-ink underline-offset-4 hover:underline",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center px-3 py-2 text-sm font-medium disabled:opacity-50",
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
        "border-line bg-bg text-ink placeholder:text-muted w-full min-h-11 border px-3 py-2 text-base",
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
        "border-line bg-bg text-ink placeholder:text-muted w-full min-h-24 border px-3 py-2 text-base",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: HTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("kicker mb-1 block", className)} {...props} />;
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
    neutral: "border-line",
    warn: "border-warn",
    down: "border-down",
    up: "border-up",
  };
  return (
    <div className={cn("mt-4 border px-4 py-3 text-sm", tones[tone])} role="status">
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
    neutral: "border-line text-ink",
    up: "border-up text-up",
    down: "border-down text-down",
    warn: "border-warn text-warn",
  };
  return (
    <span className={cn("kicker inline-flex items-center border px-2 py-0.5", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-line border border-dashed px-6 py-12">
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
      <p className="kicker">{label}</p>
      <p
        className={cn(
          "tabular mt-2 text-2xl",
          direction === "up" && "text-up",
          direction === "down" && "text-down",
        )}
      >
        {direction === "up" ? "+ " : direction === "down" ? "− " : ""}
        {value}
      </p>
      {hint ? <p className="text-muted mt-1 text-xs">{hint}</p> : null}
    </Card>
  );
}
