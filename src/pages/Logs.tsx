import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { formatDate } from "@/utils/format";

export default function Logs() {
  const events = useControlCenterStore((state) => state.events);
  const auditTrail = useControlCenterStore((state) => state.auditTrail);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <SectionCard eyebrow="Worker olaylari" title="Operasyon loglari">
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
                {events.map((event) => (
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
        </SectionCard>

        <SectionCard eyebrow="Denetim izi" title="Kim neyi tetikledi">
          <div className="space-y-3">
            {auditTrail.map((entry) => (
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
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
