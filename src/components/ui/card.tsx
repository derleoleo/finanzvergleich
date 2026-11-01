import React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    // `min-w-0`: Eine Karte ist fast immer ein Raster- oder Flex-Feld, und
    // deren Mindestbreite ist von Haus aus ihr Inhalt. Ein einziges langes
    // Wort darin schob die Karte dadurch aus ihrer Zelle heraus - auf 320 px
    // gemessen 374 statt 288 px, mitsamt allem, was in ihr steht. Jetzt gibt
    // die Zelle das Maß vor, und der Inhalt richtet sich danach.
    <div
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pb-3 ${className}`} {...props} />;
}

export function CardTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-xl font-bold text-slate-900 tracking-tight ${className}`}
      {...props}
    />
  );
}

export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}
