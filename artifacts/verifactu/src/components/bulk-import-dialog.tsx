import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

export type ImportRow = Record<string, unknown>;

interface BulkImportDialogProps {
  title: string;
  description?: string;
  columns: string[];
  sampleRow?: ImportRow;
  templateFileName?: string;
  onImport: (rows: ImportRow[]) => Promise<void> | void;
  triggerLabel?: string;
}

export function BulkImportDialog({
  title,
  description,
  columns,
  sampleRow,
  templateFileName,
  onImport,
  triggerLabel,
}: BulkImportDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);

  const parseFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const parsedRows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
    setFileName(file.name);
    setRows(parsedRows);
  };

  const downloadTemplate = () => {
    const row =
      sampleRow ??
      columns.reduce<ImportRow>((acc, column) => {
        acc[column] = "";
        return acc;
      }, {});
    const worksheet = XLSX.utils.json_to_sheet([row]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("import.templateSheet"));
    XLSX.writeFile(workbook, templateFileName ?? "plantilla-importacion.xlsx");
  };

  const handleImport = async () => {
    if (rows.length === 0) {
      toast({ variant: "destructive", title: t("import.noRows") });
      return;
    }

    setIsImporting(true);
    try {
      await onImport(rows);
      toast({ title: t("import.success", { count: rows.length }) });
      setIsOpen(false);
      setRows([]);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("import.failed"),
        description: error?.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">{triggerLabel ?? t("import.button")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? t("import.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{t("import.columns")}</p>
            <p className="mt-1 text-muted-foreground">{columns.join(", ")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
              {t("import.selectFile")}
            </Button>
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              {t("import.downloadTemplate")}
            </Button>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) parseFile(file);
              }}
            />
          </div>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName} · {rows.length} {t("import.rows")}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleImport} disabled={isImporting || rows.length === 0}>
              {isImporting ? t("import.importing") : t("import.button")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
