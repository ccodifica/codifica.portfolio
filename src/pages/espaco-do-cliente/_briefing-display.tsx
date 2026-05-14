import {
  Mail,
  Phone,
  Target,
  Package,
  Users,
  Globe,
  Smartphone,
  ShoppingBag,
  Code2,
  HelpCircle,
  Cog,
  Palette,
  Sparkles,
  Calendar,
  Wallet,
  Compass,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Check,
  Quote,
  Briefcase,
  Building2,
} from "lucide-react";
import {
  PROJECT_TYPE_LABEL,
  ProjectType,
  QuestionnaireData,
} from "@/types/client-area";
import { UserAvatar } from "./_user-avatar";

// ============================================================================
// Helpers
// ============================================================================

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// Humaniza chaves técnicas vindas do briefing — ex.: "exportRel" → "Exportar relatórios"
const TECNICO_LABEL: Record<string, string> = {
  perfis: "Perfis de usuário",
  modulos: "Módulos do sistema",
  dashboard: "Dashboard",
  exportRel: "Exportar relatórios",
  integracoesSistema: "Integrações",
  paginas: "Quantidade de páginas",
  blog: "Blog",
  formulario: "Formulário de contato",
  multiIdioma: "Multi-idioma",
  catalogo: "Catálogo",
  meioPagamento: "Meios de pagamento",
  frete: "Cálculo de frete",
  cupom: "Cupons de desconto",
  plataforma: "Plataforma",
  push: "Notificações push",
  offline: "Modo offline",
  login: "Sistema de login",
  pagamentoApp: "Pagamento no app",
};

function humanizeKey(key: string): string {
  if (TECNICO_LABEL[key]) return TECNICO_LABEL[key];
  // fallback: camelCase → Title case humanizado
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatBoolPt(b: boolean): string {
  return b ? "Sim" : "Não";
}

function tipoIcon(tipo: ProjectType) {
  const map: Record<ProjectType, typeof Globe> = {
    site: Globe,
    ecommerce: ShoppingBag,
    app: Smartphone,
    sistema: Code2,
    indeciso: HelpCircle,
  };
  return map[tipo];
}

// ============================================================================
// Componente principal
// ============================================================================

export function BriefingDisplayV2({
  briefing,
  avatarUrl,
}: {
  briefing: QuestionnaireData;
  avatarUrl?: string;
}) {
  return (
    <div className="space-y-5">
      <BriefingHero briefing={briefing} avatarUrl={avatarUrl} />

      <div className="grid lg:grid-cols-2 gap-5">
        <BriefingProjeto briefing={briefing} />
        <BriefingTecnico briefing={briefing} />
        <BriefingIdentidade briefing={briefing} />
        <BriefingPrazo briefing={briefing} />
      </div>
    </div>
  );
}

// ============================================================================
// Hero do cliente
// ============================================================================

function BriefingHero({
  briefing,
  avatarUrl,
}: {
  briefing: QuestionnaireData;
  avatarUrl?: string;
}) {
  // Cada campo identificado claramente (não mais "Socio · Sky · Educação"
  // jogado solto sem contexto)
  const metaItems = [
    briefing.cargo && { label: "Cargo", value: briefing.cargo, Icon: Briefcase },
    briefing.empresa && {
      label: "Empresa",
      value: briefing.empresa,
      Icon: Building2,
    },
    briefing.ramo && { label: "Setor", value: briefing.ramo, Icon: Compass },
  ].filter(Boolean) as { label: string; value: string; Icon: typeof Briefcase }[];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 rounded-full bg-primary/[0.1] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-accent/[0.08] blur-3xl"
      />

      <div className="relative p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          {/* Avatar (foto ou iniciais com gradient) */}
          <div className="flex-shrink-0">
            <div className="relative">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/30 blur-xl scale-90"
              />
              <div className="relative">
                <UserAvatar
                  nome={briefing.nome}
                  avatarUrl={avatarUrl}
                  size="xl"
                />
              </div>
            </div>
          </div>

          {/* Info principal — nome em destaque */}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Cliente
            </div>
            <h3 className="text-xl md:text-2xl font-bold leading-tight truncate">
              {briefing.nome}
            </h3>

            {/* Metadados em mini-cards com label claro acima do valor */}
            {metaItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 max-w-md">
                {metaItems.map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="min-w-0 p-2 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">
                      <Icon className="w-2.5 h-2.5" />
                      {label}
                    </div>
                    <div className="text-sm font-semibold text-foreground/90 truncate leading-tight">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info de contato (apenas exibição) */}
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0 sm:flex-col">
            <ContatoChip icon={Mail} label={briefing.email} />
            {briefing.celular && (
              <ContatoChip icon={Phone} label={briefing.celular} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContatoChip({
  icon: Icon,
  label,
}: {
  icon: typeof Mail;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-muted/30 border-border/60 text-foreground/80 select-text">
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[160px]">{label}</span>
    </span>
  );
}

// ============================================================================
// Card de seção genérico
// ============================================================================

function SectionCard({
  icon: Icon,
  title,
  iconColor = "primary",
  children,
  className = "",
}: {
  icon: typeof Target;
  title: string;
  iconColor?: "primary" | "accent" | "success" | "muted";
  children: React.ReactNode;
  className?: string;
}) {
  const iconClasses = {
    primary: "bg-primary/15 border-primary/30 text-primary",
    accent: "bg-accent/15 border-accent/30 text-accent",
    success: "bg-success/15 border-success/30 text-success",
    muted: "bg-muted/40 border-border/60 text-muted-foreground",
  }[iconColor];

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card/50 p-5 md:p-6 ${className}`}
    >
      <header className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/40">
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconClasses}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <h4 className="text-sm font-bold uppercase tracking-[0.12em]">
          {title}
        </h4>
      </header>
      {children}
    </section>
  );
}

// ============================================================================
// Seção: Projeto
// ============================================================================

function BriefingProjeto({ briefing }: { briefing: QuestionnaireData }) {
  const TipoIcon = briefing.tipo ? tipoIcon(briefing.tipo) : HelpCircle;
  const tipoLabel = briefing.tipo
    ? PROJECT_TYPE_LABEL[briefing.tipo]
    : "Não definido";

  return (
    <SectionCard icon={Target} title="Projeto" iconColor="primary">
      <div className="space-y-4">
        {/* Tipo do projeto destacado */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/30">
          <TipoIcon className="w-4 h-4 text-primary" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80 leading-none mb-0.5">
              Tipo
            </div>
            <div className="text-sm font-bold leading-tight">{tipoLabel}</div>
          </div>
        </div>

        {briefing.objetivoFrase && (
          <div>
            <FieldLabel>Objetivo</FieldLabel>
            <p className="text-sm text-foreground/90 leading-relaxed mt-1">
              {briefing.objetivoFrase}
            </p>
          </div>
        )}

        {briefing.entregas.length > 0 && (
          <div>
            <FieldLabel>Entregas ({briefing.entregas.length})</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {briefing.entregas.map((e, i) => (
                <Pill key={i} color={pillColor(i)} icon={Check}>
                  {e}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {briefing.publicoAlvo && (
          <div className="flex items-center gap-2 pt-1">
            <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Público
            </span>
            <span className="text-sm font-medium text-foreground/90 truncate">
              {briefing.publicoAlvo}
            </span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Seção: Detalhes técnicos
// ============================================================================

function BriefingTecnico({ briefing }: { briefing: QuestionnaireData }) {
  const entries = Object.entries(briefing.detalhesTecnicos);
  const empty = entries.length === 0;

  return (
    <SectionCard icon={Cog} title="Detalhes técnicos" iconColor="accent">
      {empty ? (
        <EmptyHint message="Sem detalhes técnicos informados." />
      ) : (
        <ul className="divide-y divide-border/40 -my-1">
          {entries.map(([k, v]) => (
            <li
              key={k}
              className="flex items-start justify-between gap-3 py-2.5"
            >
              <span className="text-sm text-muted-foreground font-medium flex-shrink-0">
                {humanizeKey(k)}
              </span>
              <TecnicoValue value={v} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function TecnicoValue({
  value,
}: {
  value: string | string[] | boolean | undefined;
}) {
  if (typeof value === "boolean") {
    return <YesNoBadge value={value ? "sim" : "nao"} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-sm text-muted-foreground/60">—</span>;
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {value.map((v, i) => (
          <Pill key={i} color={pillColor(i)} size="sm">
            {v}
          </Pill>
        ))}
      </div>
    );
  }
  if (!value) {
    return <span className="text-sm text-muted-foreground/60">—</span>;
  }
  return (
    <span className="text-sm font-semibold text-foreground/90 text-right break-words max-w-[60%]">
      {String(value)}
    </span>
  );
}

// ============================================================================
// Seção: Identidade & Referências
// ============================================================================

function BriefingIdentidade({ briefing }: { briefing: QuestionnaireData }) {
  const semConteudo =
    !briefing.temIdentidade &&
    !briefing.temDominio &&
    !briefing.referencias &&
    !briefing.estiloDesejado;

  return (
    <SectionCard
      icon={Palette}
      title="Identidade & referências"
      iconColor="success"
    >
      {semConteudo ? (
        <EmptyHint message="Sem informações de identidade visual." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {briefing.temIdentidade && (
              <BadgeField
                label="Identidade visual"
                icon={Sparkles}
                value={briefing.temIdentidade}
              />
            )}
            {briefing.temDominio && (
              <BadgeField
                label="Domínio próprio"
                icon={Globe}
                value={briefing.temDominio}
              />
            )}
          </div>

          {briefing.referencias && (
            <div>
              <FieldLabel>
                <Quote className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                Referências
              </FieldLabel>
              <blockquote className="mt-1.5 pl-3 border-l-2 border-primary/40 text-sm text-foreground/90 italic leading-relaxed">
                {briefing.referencias}
              </blockquote>
            </div>
          )}

          {briefing.estiloDesejado && (
            <div>
              <FieldLabel>Estilo desejado</FieldLabel>
              <p className="text-sm text-foreground/90 mt-1">
                {briefing.estiloDesejado}
              </p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function BadgeField({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: typeof Sparkles;
  value: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <YesNoBadge value={normalizeYesNo(value)} />
    </div>
  );
}

function normalizeYesNo(v: string): "sim" | "nao" | "parcial" | "nao_sei" {
  const s = v.toLowerCase().trim();
  if (s === "sim" || s === "yes" || s === "s") return "sim";
  if (s === "nao" || s === "não" || s === "no" || s === "n") return "nao";
  if (s === "parcial" || s === "partial") return "parcial";
  return "nao_sei";
}

function YesNoBadge({
  value,
}: {
  value: "sim" | "nao" | "parcial" | "nao_sei";
}) {
  const config = {
    sim: {
      Icon: CheckCircle2,
      label: "Sim",
      classes: "bg-success/15 text-success border-success/30",
    },
    nao: {
      Icon: XCircle,
      label: "Não",
      classes: "bg-destructive/15 text-destructive border-destructive/30",
    },
    parcial: {
      Icon: CircleDashed,
      label: "Parcial",
      classes: "bg-primary/15 text-primary border-primary/30",
    },
    nao_sei: {
      Icon: HelpCircle,
      label: "Não sei",
      classes: "bg-muted/40 text-muted-foreground border-border/60",
    },
  }[value];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${config.classes}`}
    >
      <config.Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// ============================================================================
// Seção: Prazo & Investimento
// ============================================================================

function BriefingPrazo({ briefing }: { briefing: QuestionnaireData }) {
  const vazio = !briefing.prazo && !briefing.orcamento && !briefing.comoConheceu;

  return (
    <SectionCard icon={Briefcase} title="Prazo & investimento" iconColor="muted">
      {vazio ? (
        <EmptyHint message="Sem informações de prazo ou investimento." />
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {briefing.prazo && (
              <MetricCard
                icon={Calendar}
                label="Prazo desejado"
                value={humanizePrazo(briefing.prazo)}
                accent="primary"
              />
            )}
            {briefing.orcamento && (
              <MetricCard
                icon={Wallet}
                label="Orçamento"
                value={humanizeOrcamento(briefing.orcamento)}
                accent="accent"
              />
            )}
          </div>

          {briefing.comoConheceu && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Compass className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Como conheceu
              </span>
              <span className="text-sm font-medium text-foreground/90">
                {briefing.comoConheceu}
              </span>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  accent: "primary" | "accent";
}) {
  const accentClasses = {
    primary: "from-primary/10 to-primary/[0.02] border-primary/20",
    accent: "from-accent/10 to-accent/[0.02] border-accent/20",
  }[accent];
  const iconColor = {
    primary: "text-primary",
    accent: "text-accent",
  }[accent];

  return (
    <div
      className={`p-3 rounded-xl bg-gradient-to-br border ${accentClasses}`}
    >
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 ${iconColor}`}
      >
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-base font-bold leading-tight break-words">
        {value}
      </div>
    </div>
  );
}

// Humaniza valores comuns do questionário se necessário
function humanizePrazo(v: string): string {
  const map: Record<string, string> = {
    ate_1_mes: "Até 1 mês",
    "1_a_3_meses": "1 a 3 meses",
    "3_a_6_meses": "3 a 6 meses",
    mais_6_meses: "Mais de 6 meses",
    sem_pressa: "Sem pressa",
  };
  return map[v] ?? v;
}

function humanizeOrcamento(v: string): string {
  const map: Record<string, string> = {
    ate_5k: "Até R$ 5 mil",
    "5k_a_10k": "R$ 5 mil a R$ 10 mil",
    "10k_a_30k": "R$ 10 mil a R$ 30 mil",
    "30k_a_50k": "R$ 30 mil a R$ 50 mil",
    mais_50k: "Mais de R$ 50 mil",
    sob_consulta: "A combinar",
  };
  return map[v] ?? v;
}

// ============================================================================
// Subcomponentes utilitários
// ============================================================================

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground/70 italic py-2">{message}</p>
  );
}

type PillColor = "primary" | "accent" | "success" | "muted";

function pillColor(i: number): PillColor {
  const order: PillColor[] = ["primary", "accent", "success"];
  return order[i % order.length];
}

function Pill({
  children,
  color = "primary",
  icon: Icon,
  size = "md",
}: {
  children: React.ReactNode;
  color?: PillColor;
  icon?: typeof Check;
  size?: "sm" | "md";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/30",
    accent: "bg-accent/10 text-accent border-accent/30",
    success: "bg-success/10 text-success border-success/30",
    muted: "bg-muted/40 text-foreground/80 border-border/60",
  }[color];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md border ${colorClasses} ${sizeClasses}`}
    >
      {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

// Exportar Building2 pra evitar warning de unused import — usado em fallback
export { Building2 };
