import { ReactNode } from "react";
import { FileText } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/i18n";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="relative grid min-h-screen w-screen overflow-hidden bg-slate-950 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <div className="absolute right-6 top-6 z-10 w-44">
        <LanguageSwitcher />
      </div>

      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_32%),linear-gradient(135deg,#002b74_0%,#0057c8_48%,#00a3ff_100%)] p-12 lg:flex">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_82%_75%,rgba(255,255,255,0.22),transparent_28%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 shadow-2xl ring-1 ring-white/25 backdrop-blur">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">VeriFactu</p>
            <p className="text-sm text-sky-100">{t("auth.tagline")}</p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-sky-100/80">{t("auth.heroEyebrow")}</p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            {t("auth.heroTitle")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-sky-50/82">
            {t("auth.heroDescription")}
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 text-sm text-sky-50/80">
          <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="text-2xl font-semibold text-white">AEAT</p>
            <p>Estado fiscal visible</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="text-2xl font-semibold text-white">ERP</p>
            <p>Integraciones listas</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="text-2xl font-semibold text-white">QR</p>
            <p>Verificación móvil</p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] px-6 py-12 text-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">VeriFactu</h1>
            <p className="mt-2 text-sm text-slate-600">{t("auth.tagline")}</p>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/88 px-8 py-9 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="mb-7 hidden lg:block">
              <h2 className="text-2xl font-semibold tracking-tight">VeriFactu</h2>
              <p className="mt-1 text-sm text-slate-500">{t("auth.tagline")}</p>
            </div>
          {children}
          </div>
        </div>
      </section>
    </div>
  );
}
