import type { ReactNode } from "react";
import { Activity, Cable, Command, FileWarning, LockKeyhole, LogOut, MonitorSmartphone } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { useSessionStore } from "@/store/useSessionStore";

type LayoutShellProps = {
  children: ReactNode;
};

const navigation = [
  {
    to: "/dashboard",
    label: "Panel",
    description: "Genel ozet, bagli cihazlar ve hizli komutlar burada.",
    icon: Activity,
  },
  {
    to: "/dashboard",
    label: "Cihazlar",
    description: "Kayitli Windows bilgisayarlari ve durumlarini burada gorursun.",
    icon: MonitorSmartphone,
  },
  {
    to: "/logs",
    label: "Loglar",
    description: "Worker olaylari ve kim neyi tetikledi kayitlari burada.",
    icon: FileWarning,
  },
  {
    to: "/settings",
    label: "Ayarlar",
    description: "Kurulum paketi, veritabani notlari ve sistem ayarlari burada.",
    icon: LockKeyhole,
  },
];

export function LayoutShell({ children }: LayoutShellProps) {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const logout = useSessionStore((state) => state.logout);
  const deviceCount = useControlCenterStore((state) => state.devices.length);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-6 py-6">
        <aside className="hidden w-72 shrink-0 rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.35)] lg:flex lg:flex-col">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-200">
              <Cable className="h-3.5 w-3.5" />
              OtoLogin
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">Operasyon Merkezi</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Mac uzerinden Windows makineleri izle, komut gonder ve otomatik relogin akislarini yonet.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-sky-400 text-slate-950"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                    {({ isActive }) => (
                      <>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <div>{item.label}</div>
                          <div
                            className={cn(
                              "mt-1 text-xs leading-5",
                              isActive ? "text-slate-800/80" : "text-slate-500",
                            )}
                          >
                            {item.description}
                          </div>
                        </div>
                      </>
                    )}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Oturum</div>
            <div className="mt-3 text-sm font-medium text-white">{currentUser?.name ?? "Bilinmeyen kullanici"}</div>
            <div className="mt-1 text-xs text-slate-400">{currentUser?.email ?? "Oturum yok"}</div>
            <div className="mt-4 text-xs text-slate-400">Kayitli cihaz: {deviceCount}</div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Cikis yap
            </button>
          </div>

          <div className="mt-auto rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <Command className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Toplu operasyon</div>
                <div className="text-xs text-slate-400">Tek komutta tum worker'lari tetiklemek icin hazir.</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
