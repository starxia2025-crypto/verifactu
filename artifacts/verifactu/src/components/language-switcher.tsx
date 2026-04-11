import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage, type Language } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{t("app.language")}</label>
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="es">{t("app.spanish")}</SelectItem>
          <SelectItem value="en">{t("app.english")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
