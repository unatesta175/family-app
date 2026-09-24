"use client";

export function ExportDataButton() {
  return (
    <a
      href="/api/export"
      download
      className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
    >
      Export backup (JSON)
    </a>
  );
}
