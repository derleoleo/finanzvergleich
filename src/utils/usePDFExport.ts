import { useState } from "react";

export function usePDFExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);

  const openDialog  = () => setDialogOpen(true);
  const closeDialog = () => setDialogOpen(false);

  const doExport = async (
    selectedIds: string[],
    filename: string,
    title: string,
    /** Zweite Kopfzeile im PDF, z. B. der Fassungsbezug. */
    untertitel?: string
  ) => {
    setIsExporting(true);
    try {
      // jspdf + html-to-image erst beim Export laden – hält das Initial-Bundle klein
      const { exportSections } = await import("./exportPDF");
      await exportSections("pdf-content", selectedIds, filename, title, untertitel);
    } finally {
      setIsExporting(false);
      setDialogOpen(false);
    }
  };

  return { isExporting, dialogOpen, openDialog, closeDialog, doExport };
}
