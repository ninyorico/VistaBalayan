import type { ElementType, ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  metricLabel?: string;
  metricValue?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PageHero({
  eyebrow,
  title,
  description,
  metricLabel,
  metricValue,
  actionLabel,
  onAction,
}: PageHeroProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/20 tourism-panel-dark shadow-[0_28px_90px_rgba(7,59,76,0.22)]">
      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-44 w-72 rounded-full bg-white/8 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white text-balance sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                {description}
              </p>
            )}
          </div>

          {(metricLabel && metricValue) || (actionLabel && onAction) ? (
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              {metricLabel && metricValue && (
                <div className="rounded-2xl border border-white/12 bg-white/10 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{metricLabel}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{metricValue}</p>
                </div>
              )}
              {actionLabel && onAction && (
                <Button
                  type="button"
                  onClick={onAction}
                  className="h-12 rounded-2xl bg-white px-5 text-[#0B2530] shadow-none hover:bg-cyan-50 active:translate-y-[1px]"
                >
                  {actionLabel}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  icon: ElementType;
  tone?: string;
  className?: string;
}

export function MetricCard({ label, value, helper, icon: Icon, tone = "bg-cyan-50 text-[#0E5A72] ring-cyan-100", className }: MetricCardProps) {
  return (
    <Card className={cn("tourism-card gap-0 rounded-3xl p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-tourism-hover", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#5D6F73]">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#0B2530] tabular-nums">{value}</p>
            {helper && <p className="mt-1 text-xs leading-5 text-[#5D6F73]">{helper}</p>}
          </div>
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1", tone)}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PanelCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PanelCard({ title, description, children, className }: PanelCardProps) {
  return (
    <Card className={cn("tourism-card gap-0 rounded-3xl p-0", className)}>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-lg font-semibold tracking-[-0.02em] text-[#0B2530]">{title}</CardTitle>
        {description && <p className="mt-1 text-sm leading-6 text-[#5D6F73]">{description}</p>}
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-5">{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-[#b8d2cf] bg-[#f8fbf8] px-5 py-10 text-center text-sm leading-6 text-[#5D6F73]", className)}>
      {children}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="tourism-card rounded-3xl p-0">
        <CardContent className="flex min-w-72 flex-col items-center p-8 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#0E5A72]" strokeWidth={1.8} />
          <p className="mt-4 text-sm font-medium text-[#5D6F73]">{label}</p>
        </CardContent>
      </Card>
    </div>
  );
}
