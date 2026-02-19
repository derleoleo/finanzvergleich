export default function SimplePage({ title = "Platzhalter", hint }: { title?: string; hint?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600 mt-2">
          {hint ?? "Diese Seite ist noch nicht migriert. Als nächstes kopieren wir sie aus Base44."}
        </p>
      </div>
    </div>
  );
}
