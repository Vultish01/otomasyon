import { Download, KeyRound, Package, PlayCircle, Shield, TerminalSquare, Timer, Webhook } from "lucide-react";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";

const securityItems = [
  {
    title: "Zorunlu 2FA",
    description: "Panel girisinde e-posta, sifre ve ikinci adim zorunlu tutulur.",
    icon: Shield,
  },
  {
    title: "Cihaz tokenlari",
    description: "Her Windows worker ayri token ile backend'e baglanir.",
    icon: KeyRound,
  },
  {
    title: "Cooldown kurallari",
    description: "Sonsuz relogin dongusu olusmasin diye retry araliklari tanimlanir.",
    icon: Timer,
  },
  {
    title: "Webhook hazirligi",
    description: "Ileride Telegram veya e-posta alarmi eklemek icin olay cikisi ayrildi.",
    icon: Webhook,
  },
];

const setupSteps = [
  "Windows makineden paneldeki ZIP paketini indir.",
  "ZIP'i cikartip icindeki install-otologin-worker.bat dosyasini calistir.",
  "Kurulum paketi API adresini otomatik kullanir; sadece EXE yolunu ve temel ayarlari gir.",
  "Script cihazi panele otomatik kaydeder ve worker-config.json dosyasini doldurur.",
  "Kurulum bitince worker otomatik baslar; sonraki ayarlari panelden yonetirsin.",
];

const downloadItems = [
  {
    title: "Windows Worker Paket ZIP",
    description: "Kurulum BAT, PowerShell scripti, worker kodlari ve config sablonu tek pakette.",
    href: "/downloads/otologin-windows-worker.zip",
    actionLabel: "ZIP indir",
    icon: Package,
  },
  {
    title: "Kurulum BAT",
    description: "ZIP icindeki ana kurulum dosyasinin ayri kopyasi. Referans veya yeniden indirme icin.",
    href: "/downloads/install-otologin-worker.bat",
    actionLabel: "BAT indir",
    icon: TerminalSquare,
  },
  {
    title: "Config Sablonu",
    description: "Otomatik kurulumda referans alinan worker-config.json sablonu.",
    href: "/downloads/worker-config.template.json",
    actionLabel: "JSON indir",
    icon: Download,
  },
];

export default function Settings() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <SectionCard
          eyebrow="Windows kurulum merkezi"
          title="Web panelden indirilebilir worker paketi"
          action={
            <a
              href="/downloads/otologin-windows-worker.zip"
              download
              className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              <Download className="h-4 w-4" />
              Windows paketi indir
            </a>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {downloadItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                          <Icon className="h-5 w-5 text-sky-200" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">{item.title}</h3>
                          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{item.description}</p>
                        </div>
                      </div>
                      <a
                        href={item.href}
                        download
                        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5"
                      >
                        <Download className="h-4 w-4" />
                        {item.actionLabel}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-sky-400/15 bg-sky-400/[0.06] p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-200">
                <PlayCircle className="h-3.5 w-3.5" />
                Kurulum akisi
              </div>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
                {setupSteps.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Guvenlik" title="MVP ayar stratejisi">
          <div className="grid gap-4 md:grid-cols-2">
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Icon className="h-5 w-5 text-sky-200" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Notlar" title="Sonraki gelistirme adimlari">
          <ul className="space-y-3 text-sm leading-7 text-slate-300">
            <li>Backend tarafinda gercek kullanici oturumu ve 2FA akisini tamamla.</li>
            <li>Windows worker tarafina pywinauto tabanli ekran durumu algilama bagla.</li>
            <li>Credential Manager entegrasyonu ile sifrelerin panelden ayrismasini sagla.</li>
            <li>Bildirimler icin webhook veya push alarm kanali ekle.</li>
          </ul>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
