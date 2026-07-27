import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-6 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/80 shadow-[0_40px_160px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(160deg,_rgba(8,15,30,0.96),_rgba(2,6,23,0.92))] p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-200">
            OtoLogin Control
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
            Windows relogin operasyonlarini tek panelden yonet.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            Bu ekran MVP seviyesinde statik bir giris deneyimi sunar. Gercek backend baglantisi
            tamamlandiginda 2FA ve oturum denetimi bu akisa entegre edilecek.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-200" />
                <span className="text-sm font-medium text-white">2FA zorunlulugu tasarlandi</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Kullanici girisi tamamlandiginda sadece yetkili panel hesabina komut izni verilecek.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-5 w-5 text-sky-200" />
                <span className="text-sm font-medium text-white">Cihaz bazli worker tokenlari</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Web panel dogrudan Windows'a baglanmaz; komutlari kayitli worker tokenlari ile iletir.
              </p>
            </div>
          </div>
        </div>

        <div className="p-10">
          <div className="mx-auto max-w-md">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Yonetici girisi</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Kontrol paneline gecis</h2>
            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">E-posta</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  defaultValue="moe@control.local"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Sifre</span>
                <input
                  type="password"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  defaultValue="123456"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-300">2FA kodu</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  defaultValue="000000"
                />
              </label>
            </div>
            <Link
              to="/dashboard"
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Panele gir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
