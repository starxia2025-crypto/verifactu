import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type React from "react";

interface ConfirmDeleteDialogProps {
  itemName?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  trigger?: React.ReactNode;
}

export function ConfirmDeleteDialog({
  itemName,
  isDeleting,
  onConfirm,
  trigger,
}: ConfirmDeleteDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="destructive" size="sm">
            {t("common.delete")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("common.deleteConfirmDescription", { item: itemName || t("common.thisItem") })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
