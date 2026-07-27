import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSessionStore } from "@/store/useSessionStore";

export default function Login() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const login = useSessionStore((state) => state.login);
  const register = useSessionStore((state) => state.register);
  const loadBootstrap = useSessionStore((state) => state.loadBootstrap);
  const registrationEnabled = useSessionStore((state) => state.registrationEnabled);
  const userCount = useSessionStore((state) => state.userCount);
  const isAuthenticating = useSessionStore((state) => state.isAuthenticating);
  const isRegistering = useSessionStore((state) => state.isRegistering);
  const authError = useSessionStore((state) => state.authError);
  const clearAuthError = useSessionStore((state) => state.clearAuthError);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", passwordConfirm: "" });

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    clearAuthError();
  }, [mode, clearAuthError]);

  useEffect(() => {
    if (!registrationEnabled && mode === "register") {
      setMode("login");
    }
  }, [mode, registrationEnabled]);

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogin() {
    await login(loginForm);
    navigate("/dashboard");
  }

  async function handleRegister() {
    if (registerForm.password !== registerForm.passwordConfirm) {
      return;
    }
    await register({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
    });
    navigate("/dashboard");
  }

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
            Artik bu ekran gercek kullanici kaydi ve girisiyle calisir. Ilk yonetici hesabini
            buradan olusturup paneli tamamen bos bir veritabaniyla baslatabilirsin.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-200" />
                <span className="text-sm font-medium text-white">Oturum guvenligi aktif</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Panel komutlari oturum gerektirir; cihaz listesi ve log akisi giris olmadan acilmaz.
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
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Yonetici hesabı</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {mode === "login" ? "Kontrol paneline gir" : "Yeni yonetici hesabi olustur"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {userCount === 0
                ? "Sistemde henuz kullanici yok. Ilk hesabini olusturup dogrudan iceri girebilirsin."
                : "Mevcut hesabinla giris yap veya yeni bir yonetici hesabi ekle."}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${mode === "login" ? "bg-sky-400 text-slate-950" : "text-slate-300"}`}
              >
                Giris yap
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                disabled={!registrationEnabled}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${mode === "register" ? "bg-sky-400 text-slate-950" : "text-slate-300"} disabled:cursor-not-allowed disabled:text-slate-500`}
              >
                Kayit ol
              </button>
            </div>

            {!registrationEnabled ? (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Yeni kayit kapali. Bu panelde sadece ilk yonetici hesabi aciktan olusturulur; sonrasi mevcut
                hesapla giris yapar.
              </div>
            ) : null}

            {authError ? (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {authError}
              </div>
            ) : null}

            {mode === "login" ? (
              <div className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">E-posta</span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="yonetici@firma.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Sifre</span>
                  <input
                    type="password"
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="En az 6 karakter"
                  />
                </label>
                <button
                  type="button"
                  disabled={!loginForm.email || !loginForm.password || isAuthenticating}
                  onClick={() => void handleLogin()}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {isAuthenticating ? "Giris yapiliyor..." : "Panele gir"}
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Ad soyad</span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    value={registerForm.name}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Moe Admin"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">E-posta</span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="yonetici@firma.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Sifre</span>
                  <input
                    type="password"
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="En az 6 karakter"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Sifre tekrar</span>
                  <input
                    type="password"
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    value={registerForm.passwordConfirm}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, passwordConfirm: event.target.value }))
                    }
                    placeholder="Ayni sifreyi tekrar yaz"
                  />
                </label>
                {registerForm.passwordConfirm && registerForm.password !== registerForm.passwordConfirm ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Sifre alanlari ayni olmali.
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={
                    !registrationEnabled ||
                    !registerForm.name ||
                    !registerForm.email ||
                    !registerForm.password ||
                    !registerForm.passwordConfirm ||
                    registerForm.password !== registerForm.passwordConfirm ||
                    isRegistering
                  }
                  onClick={() => void handleRegister()}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  <UserPlus className="h-4 w-4" />
                  {isRegistering ? "Kayit olusturuluyor..." : "Kayit ol"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
