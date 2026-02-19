import React from "react";

type Tone = "neutral" | "info" | "success" | "warning";

type Props = {
  title: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  tone?: Tone;
};

const toneStyles: Record<Tone, { wrap: string; icon: string }> = {
  neutral: {
    wrap: "bg-white border-slate-200",
    icon: "bg-slate-100 text-slate-700",
  },
  info: {
    wrap: "bg-white border-slate-200",
    icon: "bg-blue-100 text-blue-700",
  },
  success: {
    wrap: "bg-white border-slate-200",
    icon: "bg-green-100 text-green-700",
  },
  warning: {
    wrap: "bg-white border-slate-200",
    icon: "bg-orange-100 text-orange-700",
  },
};

export default function SummaryCard({
  title,
  value,
  subtext,
  icon,
  tone = "neutral",
}: Props) {
  const s = toneStyles[tone];

  return (
    <div
      className={`rounded-2xl border ${s.wrap} shadow-sm p-5 text-left flex items-start gap-4`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.icon}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-sm text-slate-600 font-medium">{title}</div>
        <div className="text-2xl font-bold text-slate-900 mt-1 leading-tight">
          {value}
        </div>
        {subtext ? (
          <div className="text-xs text-slate-500 mt-1">{subtext}</div>
        ) : null}
      </div>
    </div>
  );
}
