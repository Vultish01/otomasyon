import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, eyebrow, action, children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {eyebrow ? (
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{eyebrow}</div>
          ) : null}
          <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
