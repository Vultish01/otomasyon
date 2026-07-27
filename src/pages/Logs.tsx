import { useEffect } from "react";
import type { AuditEntry, DeviceEvent } from "@shared/types";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { formatDate } from "@/utils/format";

export default function Logs() {
  const events = useControlCenterStore((state) => state.events);
  const auditTrail = useControlCenterStore((state) => state.auditTrail);
  const loadDashboardData = useControlCenterStore((state) => state.loadDashboardData);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <SectionCard eyebrow="Sayfa rehberi" title="Loglar sekmesi ne ise yarar?">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white">Operasyon loglari</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Worker tarafindan gonderilen logout, restart, login ve hata olaylarini zaman sirasiyla listeler.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white">Denetim izi</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Panelde hangi kullanicinin hangi komutu hangi cihaza gonderdigini ayri olarak tutar.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Worker olaylari" title="Operasyon loglari">
          {events.length > 0 ? (
            <div className="overflow-hidden rounded-[24px] border border-white/8">
              <table className="min-w-full divide-y divide-white/8 text-left">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Zaman</th>
                    <th className="px-4 py-3">Cihaz</th>
                    <th className="px-4 py-3">Olay</th>
                    <th className="px-4 py-3">Mesaj</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 bg-slate-950/40 text-sm text-slate-200">
                  {events.map((event: DeviceEvent) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3 text-slate-400">{formatDate(event.createdAt)}</td>
                      <td className="px-4 py-3">{event.deviceId}</td>
                      <td className="px-4 py-3 uppercase tracking-[0.18em] text-slate-400">{event.eventType}</td>
                      <td className="px-4 py-3">{event.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 px-5 py-6 text-sm leading-7 text-slate-300">
              Henuz worker logu yok. Ilk cihaz baglanip heartbeat ve olay gondermeye basladiginda bu tablo dolacak.
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Denetim izi" title="Kim neyi tetikledi">
          {auditTrail.length > 0 ? (
            <div className="space-y-3">
              {auditTrail.map((entry: AuditEntry) => (
                <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{entry.action}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {entry.actor} {"->"} {entry.target}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(entry.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 px-5 py-6 text-sm leading-7 text-slate-300">
              Henuz panelden manuel komut gonderilmedi. Relogin, yeniden baslat veya helper komutlari burada kayda duser.
            </div>
          )}
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
