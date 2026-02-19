import React from "react";

type Variant = "default" | "destructive";

export function Alert({
  className = "",
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  const base = "relative w-full rounded-2xl border p-4";
  const v =
    variant === "destructive"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-slate-200 bg-white text-slate-900";

  return <div role="alert" className={`${base} ${v} ${className}`} {...props} />;
}

export function AlertTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={`mb-1 font-semibold leading-none tracking-tight ${className}`} {...props} />
  );
}

export function AlertDescription({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`text-sm text-slate-700 ${className}`} {...props} />;
}
