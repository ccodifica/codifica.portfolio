import { CheckCircle2, Clock } from "lucide-react";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  ProjectStatus,
} from "@/types/client-area";

/**
 * Stepper "hero" do painel do cliente — mostra de relance em que etapa o
 * projeto está, o progresso geral e a sequência de fases.
 *
 * Versão desktop: stepper horizontal com nodes e linha conectora animada.
 * Versão mobile: lista vertical compacta com linha lateral.
 */
export function ProjectEtapasHero({
  statusAtual,
  progresso,
}: {
  statusAtual: ProjectStatus;
  progresso: number;
}) {
  const idxAtual = PROJECT_STATUS_ORDER.indexOf(statusAtual);
  const ultimoIdx = PROJECT_STATUS_ORDER.length - 1;
  // Preenchimento da linha conectora — 0% no primeiro node, 100% no último.
  // Quando concluído, a linha vai inteira.
  const linhaPreenchida =
    statusAtual === "concluido"
      ? 100
      : idxAtual === 0
      ? 0
      : (idxAtual / ultimoIdx) * 100;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50">
      {/* Glow sutil no fundo - paleta da Codifica */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-primary/[0.08] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-accent/[0.08] blur-3xl"
      />

      <div className="relative p-4 md:p-5">
        {/* Header: etapa atual + progresso */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Etapa atual
            </div>
            <h3 className="text-lg md:text-xl font-bold leading-tight truncate">
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {PROJECT_STATUS_LABEL[statusAtual]}
              </span>
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Progresso
            </div>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-xl md:text-2xl font-bold tabular-nums leading-none bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {progresso}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                %
              </span>
            </div>
          </div>
        </div>

        {/* DESKTOP — Stepper horizontal */}
        <div className="hidden sm:block relative pt-0.5">
          {/* Linhas conectoras (offset = metade do node desktop = 16px) */}
          <div className="absolute left-4 right-4 top-[15px] h-[2px] rounded-full bg-border/50" />
          <div
            className="absolute left-4 top-[15px] h-[2px] rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-700 ease-out"
            style={{
              width: `calc((100% - 2rem) * ${linhaPreenchida / 100})`,
            }}
          />

          <ol className="relative flex items-start justify-between">
            {PROJECT_STATUS_ORDER.map((s, i) => {
              const concluida =
                i < idxAtual || statusAtual === "concluido";
              const atual =
                i === idxAtual && statusAtual !== "concluido";
              return (
                <li
                  key={s}
                  className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                >
                  <StepperNode concluida={concluida} atual={atual} />
                  <span
                    className={`text-[10.5px] text-center leading-tight px-1 max-w-[80px] transition-colors ${
                      atual
                        ? "font-bold text-foreground"
                        : concluida
                        ? "font-medium text-foreground/75"
                        : "font-medium text-muted-foreground/55"
                    }`}
                  >
                    {PROJECT_STATUS_LABEL[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* MOBILE — Lista vertical compacta com linha lateral */}
        <ol className="sm:hidden relative space-y-3 pl-1">
          {/* Linha vertical conectora */}
          <div className="absolute left-[14px] top-3 bottom-3 w-[2px] rounded-full bg-border/50" />
          <div
            className="absolute left-[14px] top-3 w-[2px] rounded-full bg-gradient-to-b from-primary to-accent transition-all duration-700"
            style={{
              height: `calc((100% - 1.5rem) * ${linhaPreenchida / 100})`,
            }}
          />

          {PROJECT_STATUS_ORDER.map((s, i) => {
            const concluida = i < idxAtual || statusAtual === "concluido";
            const atual = i === idxAtual && statusAtual !== "concluido";
            return (
              <li key={s} className="relative flex items-center gap-3">
                <StepperNode concluida={concluida} atual={atual} compact />
                <span
                  className={`text-sm transition-colors ${
                    atual
                      ? "font-bold text-foreground"
                      : concluida
                      ? "font-medium text-foreground/75"
                      : "text-muted-foreground/65"
                  }`}
                >
                  {PROJECT_STATUS_LABEL[s]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function StepperNode({
  concluida,
  atual,
  compact = false,
}: {
  concluida: boolean;
  atual: boolean;
  compact?: boolean;
}) {
  const size = compact ? "w-[26px] h-[26px]" : "w-8 h-8";
  const iconSize = compact ? "w-3 h-3" : "w-[15px] h-[15px]";

  if (concluida) {
    return (
      <div
        className={`${size} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_4px_14px_-2px_rgba(139,61,245,0.3)] ring-[3px] ring-card relative z-10`}
      >
        <CheckCircle2
          className={`${iconSize} text-white`}
          strokeWidth={2.5}
        />
      </div>
    );
  }

  if (atual) {
    return (
      <div className="relative z-10">
        {/* Halo pulsante */}
        <div
          aria-hidden
          className={`absolute inset-0 ${size} rounded-full bg-primary/30 animate-ping-slow`}
        />
        {/* Node principal com glow */}
        <div
          className={`relative ${size} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_0_4px_rgba(139,61,245,0.18),0_8px_24px_-4px_rgba(139,61,245,0.5)] ring-[3px] ring-card`}
        >
          <Clock className={`${iconSize} text-white`} strokeWidth={2.5} />
        </div>
      </div>
    );
  }

  // Pendente — circulo outlined sutil
  return (
    <div
      className={`${size} rounded-full border-2 border-border/60 bg-card ring-[3px] ring-card relative z-10 flex items-center justify-center`}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
    </div>
  );
}
