import React from "react";

type Variant = "default" | "outline" | "destructive";

export function Badge({
  variant = "default",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs border";
  const v =
    variant === "outline"
      ? "bg-transparent"
      : variant === "destructive"
      ? "bg-red-600 text-white border-transparent"
      : "bg-gradient-to-tr from-brand-cyan to-brand-blue text-white border-transparent";

  return <span className={`${base} ${v} ${className}`} {...props} />;
}
