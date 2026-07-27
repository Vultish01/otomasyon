import type { ReactNode } from "react";
import { Activity, Cable, Command, FileWarning, LockKeyhole, MonitorSmartphone } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type LayoutShellProps = {
  children: ReactNode;
};

const navigation = [
  { to: "/dashboard", label: "Panel", icon: Activity },
  { to: "/devices/win-floor-01", label: "Cihazlar", icon: MonitorSmartphone },
  { to: "/logs", label: "Loglar", icon: FileWarning },
  { to: "/settings", label: "Ayarlar", icon: LockKeyhole },
];

export function LayoutShell({ children }: LayoutShellProps) {
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
                  key={item.to}
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
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

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
