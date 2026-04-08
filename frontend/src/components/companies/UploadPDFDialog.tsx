"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUploadCompaniesPDF } from "@/hooks/useCompanies";
import { Upload, FileText, FileSpreadsheet } from "lucide-react";

export function UploadPDFDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadCompaniesPDF();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit() {
    if (!file) return;
    await upload.mutateAsync(file);
    setOpen(false);
    setFile(null);
  }

  const name = file?.name.toLowerCase() ?? "";
  const isCSV = name.endsWith(".csv");
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
  const FileIcon = isCSV || isExcel ? FileSpreadsheet : FileText;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Companies</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Format hint */}
          <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Supported formats</p>
            <p><span className="font-medium">CSV / Excel</span> — columns: <code>name, website, careers_url, industry, notes</code></p>
            <p><span className="font-medium">PDF</span> — company list (one per line or table)</p>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition hover:bg-accent"
          >
            {file ? (
              <>
                <FileIcon className="mb-2 h-8 w-8 text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to select file</p>
                <p className="text-xs text-muted-foreground">PDF, CSV, or Excel</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <Button
            className="w-full"
            disabled={!file || upload.isPending}
            onClick={handleSubmit}
          >
            {upload.isPending ? "Importing..." : `Import${file ? ` ${isCSV ? "CSV" : isExcel ? "Excel" : "PDF"}` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
