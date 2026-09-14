import { cn } from "@/lib/utils";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-extrabold text-carbon shadow-edge transition hover:bg-[#00AB96] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-carbon outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line/80 bg-panel p-5 shadow-panel",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-extrabold uppercase text-slate-600",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-line/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="relative pl-4">
        <span className="absolute left-0 top-1 h-[calc(100%-0.25rem)] w-1 rounded-full bg-brand" />
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-mint">
          Operación diaria
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold leading-none text-carbon sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-muted">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/80 px-6 py-16 text-center text-sm font-semibold text-muted">
      {children}
    </div>
  );
}
