import { useMemo, useState } from "react";
import { CheckCircle2, Download, KeyRound, Package, PlayCircle, Shield, TerminalSquare, Timer, Webhook } from "lucide-react";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";

const securityItems = [
  {
    title: "Oturum korumasi",
    description: "Panel girisi e-posta, sifre ve oturum tokeni ile korunur.",
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

const downloadItems = [
  {
    title: "Windows Worker Paket ZIP",
    description: "Kurulum BAT, PowerShell scripti, worker kodlari ve config sablonu tek pakette.",
    href: "/downloads/otologin-windows-worker.zip?v=20260727-4",
    actionLabel: "ZIP indir",
    icon: Package,
  },
  {
    title: "Kurulum BAT",
    description: "ZIP icindeki ana kurulum dosyasinin ayri kopyasi. Referans veya yeniden indirme icin.",
    href: "/downloads/install-otologin-worker.bat?v=20260727-4",
    actionLabel: "BAT indir",
    icon: TerminalSquare,
  },
  {
    title: "Config Sablonu",
    description: "Otomatik kurulumda referans alinan worker-config.json sablonu.",
    href: "/downloads/worker-config.template.json?v=20260727-4",
    actionLabel: "JSON indir",
    icon: Download,
  },
];

export default function Settings() {
  const [wizardState, setWizardState] = useState({
    exePath: "",
    windowCount: 4,
    useHotkey: false,
    hotkey: "CTRL+ALT+L",
    helperProgramPath: "",
    helperTrigger: "none",
  });

  const wizardChecklist = useMemo(
    () => [
      "Hedef Windows makinede uygulamanin EXE yolunu hazirla.",
      "Ayni PC'de gerekiyorsa yardimci program yolunu not et.",
      "ZIP paketini indir ve kurulum BAT dosyasini yonetici olarak calistir.",
      "Kurulum tamamlaninca panelde cihaz kartinin otomatik olustugunu dogrula.",
    ],
    [],
  );

  return (
    <LayoutShell>
      <div className="space-y-6">
        <SectionCard
          eyebrow="Windows kurulum merkezi"
          title="Web panelden indirilebilir worker paketi"
          action={
            <a
              href="/downloads/otologin-windows-worker.zip?v=20260727-4"
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
                Kolay kurulum
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Artik demo yonlendirmeler yerine gercek kurulum sihirbazi mantigiyla ilerleyebilirsin.
                Asagidaki adimlar yeni kurulum yapan kisiye sirayla ne yapacagini net gosterir.
              </p>
              <div className="mt-5 space-y-3">
                {wizardChecklist.map((step) => (
                  <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span className="text-sm text-slate-200">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Kurulum sihirbazi" title="Windows kurulumu oncesi hizli hazirlik">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-200">Takip edilecek ana EXE yolu</span>
                <input
                  value={wizardState.exePath}
                  onChange={(event) => setWizardState((current) => ({ ...current, exePath: event.target.value }))}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  placeholder="C:\\Program Files\\Broker\\broker.exe"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Acilacak pencere sayisi</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={wizardState.windowCount}
                  onChange={(event) =>
                    setWizardState((current) => ({ ...current, windowCount: Number(event.target.value) || 1 }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Logout sonrasi helper tetigi</span>
                <select
                  value={wizardState.helperTrigger}
                  onChange={(event) =>
                    setWizardState((current) => ({ ...current, helperTrigger: event.target.value }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                >
                  <option value="none">Yok</option>
                  <option value="hotkey">Hotkey</option>
                  <option value="click">Tiklama</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-200">Yardimci program yolu</span>
                <input
                  value={wizardState.helperProgramPath}
                  onChange={(event) =>
                    setWizardState((current) => ({ ...current, helperProgramPath: event.target.value }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  placeholder="C:\\Program Files\\Helper\\helper.exe"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4 md:col-span-2">
                <input
                  type="checkbox"
                  checked={wizardState.useHotkey}
                  onChange={(event) => setWizardState((current) => ({ ...current, useHotkey: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-slate-900"
                />
                <div>
                  <div className="text-sm font-medium text-white">Login oncesi hotkey kullan</div>
                  <div className="text-xs text-slate-400">
                    Sistem logout algilarsa once bu tusu gonderebilir, sonra login akisini baslatir.
                  </div>
                </div>
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-200">Hotkey</span>
                <input
                  value={wizardState.hotkey}
                  onChange={(event) => setWizardState((current) => ({ ...current, hotkey: event.target.value }))}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  placeholder="CTRL+ALT+L"
                />
              </label>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Kurulum ozeti</div>
              <h3 className="mt-3 text-lg font-semibold text-white">Bu kurulumda ne olacak?</h3>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                <p>
                  Worker paketi hedef PC'ye kurulacak, cihaz panele otomatik kaydolacak ve ana EXE
                  dosyasi izlenmeye baslayacak.
                </p>
                <p>Acilacak pencere sayisi: <span className="font-semibold text-white">{wizardState.windowCount}</span></p>
                <p>Ana EXE: <span className="font-semibold text-white">{wizardState.exePath || "Henuz girilmedi"}</span></p>
                <p>Helper program: <span className="font-semibold text-white">{wizardState.helperProgramPath || "Kullanilmayacak"}</span></p>
                <p>Login oncesi hotkey: <span className="font-semibold text-white">{wizardState.useHotkey ? wizardState.hotkey : "Kapali"}</span></p>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs leading-6 text-slate-300">
                Kurulum yapan kisiye soylenecek kisa ozet:
                <br />
                  <code>ZIP'i indir -&gt; BAT'i yonetici olarak ac -&gt; EXE yolunu gir -&gt; kurulum bitsin -&gt; panelde cihaz karti gorunsun</code>
              </div>
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

        <SectionCard eyebrow="Veritabani" title="Sistemde veriler nerede tutuluyor?">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white">Mevcut veritabani yapisi</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Panel kullanicilari, oturumlar, cihazlar, loglar ve cihaz ayarlari backend tarafindaki
                SQLite veritabaninda tutulur. Dosya varsayilan olarak <code>data/otologin.sqlite3</code>
                altina yazilir.
              </p>
            </div>
            <div className="rounded-[24px] border border-amber-500/15 bg-amber-500/[0.05] p-5">
              <div className="text-sm font-semibold text-white">Ucretsiz deploy notu</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Render ucretsiz web servislerinde yerel dosyalar kalici degildir. Yani bu SQLite dosyasi
                yeniden deploy veya servis uykuya gecince sifirlanabilir. Kalici canli kullanim icin
                ucretli disk ya da harici Postgres baglantisi gerekir.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Notlar" title="Sonraki gelistirme adimlari">
          <ul className="space-y-3 text-sm leading-7 text-slate-300">
            <li>Panel auth su an SQLite tabanli calisiyor; sonraki adimda 2FA eklenebilir.</li>
            <li>Kalici uretim veritabani icin Postgres'e gecis veya ucretli disk secenegi eklenebilir.</li>
            <li>Credential Manager entegrasyonu ile sifrelerin panelden ayrismasi surdurulebilir.</li>
            <li>Bildirimler icin webhook veya push alarm kanali eklenebilir.</li>
          </ul>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
