import { useState } from "react";
import { exportSections } from "./exportPDF";

export function usePDFExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);

  const openDialog  = () => setDialogOpen(true);
  const closeDialog = () => setDialogOpen(false);

  const doExport = async (
    selectedIds: string[],
    filename: string,
    title: string
  ) => {
    setIsExporting(true);
    try {
      await exportSections("pdf-content", selectedIds, filename, title);
    } finally {
      setIsExporting(false);
      setDialogOpen(false);
    }
  };

  return { isExporting, dialogOpen, openDialog, closeDialog, doExport };
}
