import React from "react";

type Variant = "default" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className = "",
  variant = "default",
  size = "md",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

  const variantClass =
    variant === "outline"
      ? "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
      : variant === "ghost"
      ? "bg-transparent hover:bg-slate-100 text-slate-900"
      : "bg-gradient-to-tr from-brand-cyan to-brand-blue hover:opacity-90 text-white transition-opacity";

  const sizeClass =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
      ? "h-12 px-6 text-base"
      : "h-10 px-4 text-sm"; // md

  return (
    <button
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    />
  );
}
