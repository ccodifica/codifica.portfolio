import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  Circle,
  Save,
  FileText,
  Clock,
  FileDown,
  Send,
  EyeOff,
  Eye,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DocumentacoesProjeto,
  EMPTY_ETAPA_DOC,
  EtapaDocumentacao,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  Project,
  ProjectStatus,
} from "@/types/client-area";
import { ETAPA_GUIDE } from "@/lib/etapa-guide";
import { upsertEtapaDocumentacao } from "@/lib/client-area-store";

// ============================================================================
// Status visual da etapa
// ============================================================================

export type EtapaEstado = "concluida" | "atual" | "pendente";

export function getEtapaEstado(
  etapa: ProjectStatus,
  projectStatus: ProjectStatus,
  doc?: EtapaDocumentacao
): EtapaEstado {
  if (doc?.concluidoEm) return "concluida";
  if (etapa === projectStatus) return "atual";
  return "pendente";
}

const ESTADO_VISUAL: Record<
  EtapaEstado,
  {
    Icon: typeof CheckCircle2;
    iconColor: string;
    iconBg: string;
    label: string;
    labelBg: string;
  }
> = {
  concluida: {
    Icon: CheckCircle2,
    iconColor: "text-success",
    iconBg: "bg-success/10 border-success/30",
    label: "Concluída",
    labelBg: "bg-success/15 text-success border-success/30",
  },
  atual: {
    Icon: CircleDot,
    iconColor: "text-primary",
    iconBg: "bg-primary/15 border-primary/40",
    label: "Atual",
    labelBg: "bg-primary/15 text-primary border-primary/40",
  },
  pendente: {
    Icon: Circle,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted/30 border-border/60",
    label: "Pendente",
    labelBg: "bg-muted/40 text-muted-foreground border-border/60",
  },
};

// ============================================================================
// Card de uma etapa — modo admin (editável)
// ============================================================================

interface AdminCardProps {
  etapa: ProjectStatus;
  project: Project;
  onSaved: () => void;
}

export function DocumentacaoEtapaCardAdmin({
  etapa,
  project,
  onSaved,
}: AdminCardProps) {
  const guide = ETAPA_GUIDE[etapa];
  const docAtual = project.documentacoes[etapa];
  const estado = getEtapaEstado(etapa, project.status, docAtual);
  const visual = ESTADO_VISUAL[estado];

  const [resumo, setResumo] = useState(docAtual?.resumo ?? "");
  const [entregaveis, setEntregaveis] = useState(docAtual?.entregaveis ?? "");
  const [pontosAtencao, setPontosAtencao] = useState(
    docAtual?.pontosAtencao ?? ""
  );
  const [proximosPassos, setProximosPassos] = useState(
    docAtual?.proximosPassos ?? ""
  );
  const [saving, setSaving] = useState(false);

  // Se mudou de projeto/etapa, refaz o estado.
  useEffect(() => {
    setResumo(docAtual?.resumo ?? "");
    setEntregaveis(docAtual?.entregaveis ?? "");
    setPontosAtencao(docAtual?.pontosAtencao ?? "");
    setProximosPassos(docAtual?.proximosPassos ?? "");
  }, [
    docAtual?.resumo,
    docAtual?.entregaveis,
    docAtual?.pontosAtencao,
    docAtual?.proximosPassos,
  ]);

  const handleSalvar = async (opts: {
    publicar?: boolean;
    despublicar?: boolean;
    marcarConcluida?: boolean;
    desmarcarConcluida?: boolean;
  }) => {
    setSaving(true);
    try {
      const patch: Partial<EtapaDocumentacao> = {
        resumo,
        entregaveis,
        pontosAtencao,
        proximosPassos,
      };
      if (opts.publicar) patch.publicado = true;
      if (opts.despublicar) patch.publicado = false;
      if (opts.marcarConcluida) {
        patch.concluidoEm = new Date().toISOString();
      }
      if (opts.desmarcarConcluida) {
        patch.concluidoEm = undefined;
      }
      await upsertEtapaDocumentacao(
        project.id,
        etapa,
        patch,
        project.documentacoes
      );
      toast.success(
        opts.publicar
          ? "Documentação publicada — o cliente já está vendo."
          : opts.despublicar
          ? "Despublicada — o cliente não vê mais essa etapa."
          : opts.marcarConcluida
          ? "Etapa marcada como concluída."
          : opts.desmarcarConcluida
          ? "Conclusão desmarcada."
          : "Rascunho salvo (cliente não vê ainda)."
      );
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccordionItem
      value={etapa}
      className={`border rounded-xl px-4 transition-colors ${
        estado === "atual"
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border/40 bg-card/40"
      } data-[state=open]:bg-card/60`}
    >
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-1 items-center gap-3 pr-2 text-left">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}
          >
            <visual.Icon className={`w-4 h-4 ${visual.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{guide.titulo}</div>
            <div className="text-xs text-muted-foreground">
              {docAtual?.concluidoEm && (
                <>
                  Concluída em{" "}
                  {new Date(docAtual.concluidoEm).toLocaleDateString("pt-BR")} ·{" "}
                </>
              )}
              {!docAtual?.resumo &&
              !docAtual?.entregaveis &&
              !docAtual?.pontosAtencao &&
              !docAtual?.proximosPassos
                ? "Documentação não preenchida"
                : "Documentação preenchida"}
            </div>
          </div>
          <span
            className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${visual.labelBg}`}
          >
            {visual.label}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-2 space-y-4">
        <GuiaEtapa guide={guide} collapsible />

        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          <CampoDoc
            label="Resumo do que foi feito"
            placeholder="Ex.: Analisamos o briefing e identificamos 3 pontos..."
            value={resumo}
            onChange={setResumo}
          />
          <CampoDoc
            label="Entregáveis / Pontos validados"
            placeholder="Ex.: Escopo definido, prazo aprovado..."
            value={entregaveis}
            onChange={setEntregaveis}
          />
          <CampoDoc
            label="Pontos de atenção"
            placeholder="Ex.: Cliente precisa fornecer logos..."
            value={pontosAtencao}
            onChange={setPontosAtencao}
          />
          <CampoDoc
            label="Próximos passos"
            placeholder="Ex.: Iniciar fase de design..."
            value={proximosPassos}
            onChange={setProximosPassos}
          />
        </div>

        <div className="pt-2 border-t border-border/40 space-y-3">
          <div
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
              docAtual?.publicado
                ? "bg-success/10 border-success/30 text-success"
                : "bg-muted/30 border-border/60 text-muted-foreground"
            }`}
          >
            {docAtual?.publicado ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>
                  <strong>Publicada</strong> — o cliente está vendo esta etapa
                  no painel.
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>
                  <strong>Rascunho</strong> — só você vê. Publique quando
                  estiver pronto pra mostrar pro cliente.
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSalvar({})}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar rascunho"}
            </Button>

            {!docAtual?.publicado ? (
              <Button
                size="sm"
                onClick={() => handleSalvar({ publicar: true })}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Send className="w-4 h-4 mr-2" />
                Publicar pro cliente
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSalvar({ despublicar: true })}
                disabled={saving}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Despublicar
              </Button>
            )}

            {!docAtual?.concluidoEm ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSalvar({ marcarConcluida: true })}
                disabled={saving}
                className="text-success hover:bg-success/10 hover:text-success"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como concluída
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  handleSalvar({ desmarcarConcluida: true })
                }
                disabled={saving}
                className="text-muted-foreground"
              >
                <Circle className="w-4 h-4 mr-2" />
                Desmarcar conclusão
              </Button>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ============================================================================
// Card de uma etapa — modo cliente (somente leitura)
// ============================================================================

interface ClientCardProps {
  etapa: ProjectStatus;
  project: Project;
}

export function DocumentacaoEtapaCardCliente({
  etapa,
  project,
}: ClientCardProps) {
  const guide = ETAPA_GUIDE[etapa];
  const doc = project.documentacoes[etapa];
  const estado = getEtapaEstado(etapa, project.status, doc);
  const visual = ESTADO_VISUAL[estado];

  // Cliente só vê os campos preenchidos se a etapa estiver publicada.
  // Rascunho do admin (publicado=false) aparece como "em preparação".
  const visivelPraCliente = Boolean(doc?.publicado);
  const temAlgumConteudo =
    visivelPraCliente &&
    Boolean(
      doc?.resumo ||
        doc?.entregaveis ||
        doc?.pontosAtencao ||
        doc?.proximosPassos
    );

  return (
    <AccordionItem
      value={etapa}
      className={`border rounded-xl px-4 transition-colors ${
        estado === "atual"
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border/40 bg-card/40"
      } data-[state=open]:bg-card/60`}
    >
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-1 items-center gap-3 pr-2 text-left">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}
          >
            <visual.Icon className={`w-4 h-4 ${visual.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{guide.titulo}</div>
            <div className="text-xs text-muted-foreground">
              {doc?.concluidoEm && (
                <>
                  Concluída em{" "}
                  {new Date(doc.concluidoEm).toLocaleDateString("pt-BR")}
                </>
              )}
              {!doc?.concluidoEm &&
                estado === "atual" &&
                "Estamos nesta etapa agora"}
              {!doc?.concluidoEm &&
                estado === "pendente" &&
                "Ainda não iniciada"}
            </div>
          </div>
          <span
            className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${visual.labelBg}`}
          >
            {visual.label}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-2 space-y-5">
        <GuiaEtapa guide={guide} />

        {temAlgumConteudo ? (
          <div className="space-y-4">
            <CampoDocReadonly
              label="Resumo do que foi feito"
              value={doc?.resumo}
            />
            <CampoDocReadonly
              label="Entregáveis / Pontos validados"
              value={doc?.entregaveis}
            />
            <CampoDocReadonly
              label="Pontos de atenção"
              value={doc?.pontosAtencao}
            />
            <CampoDocReadonly
              label="Próximos passos"
              value={doc?.proximosPassos}
            />
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-border/60 bg-card/30 text-center">
            <Clock className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              {!visivelPraCliente
                ? "A equipe da Codifica está preparando a documentação desta etapa. Você vê aqui assim que ela for publicada."
                : "Documentação ainda não disponível."}
            </p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

// ============================================================================
// Subcomponentes
// ============================================================================

function GuiaEtapa({
  guide,
  collapsible = false,
}: {
  guide: (typeof ETAPA_GUIDE)[ProjectStatus];
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);

  const checklists = (
    <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-border/30">
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          O que a Codifica faz
        </div>
        <ul className="space-y-1">
          {guide.oQueFazemos.map((item, i) => (
            <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
              <span className="text-primary">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Pra finalizar a etapa
        </div>
        <ul className="space-y-1">
          {guide.paraFinalizar.map((item, i) => (
            <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
              <span className="text-accent">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="p-4 rounded-lg bg-gradient-to-br from-primary/[0.06] via-card/30 to-accent/[0.06] border border-border/40 space-y-3">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground/90">{guide.descricao}</p>
        </div>
        {checklists}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg bg-gradient-to-br from-primary/[0.06] via-card/30 to-accent/[0.06] border border-border/40 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted/20 transition-colors"
          >
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/90 flex-1 line-clamp-1">
              {guide.descricao}
            </p>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 -mt-1 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <p className="text-sm text-foreground/90 pl-6 pr-6 -mt-1 mb-1">
            {guide.descricao}
          </p>
          {checklists}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function CampoDoc({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 resize-y text-sm min-h-[80px]"
      />
    </div>
  );
}

function CampoDocReadonly({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Lista completa de etapas (admin)
// ============================================================================

export function DocumentacaoEtapasAdmin({
  project,
  onSaved,
}: {
  project: Project;
  onSaved: () => void;
}) {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {PROJECT_STATUS_ORDER.map((etapa) => (
        <DocumentacaoEtapaCardAdmin
          key={etapa}
          etapa={etapa}
          project={project}
          onSaved={onSaved}
        />
      ))}
    </Accordion>
  );
}

// ============================================================================
// Lista completa de etapas (cliente)
// ============================================================================

export function DocumentacaoEtapasCliente({ project }: { project: Project }) {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {PROJECT_STATUS_ORDER.map((etapa) => (
        <DocumentacaoEtapaCardCliente
          key={etapa}
          etapa={etapa}
          project={project}
        />
      ))}
    </Accordion>
  );
}

// Re-export pra evitar import duplicado em quem consome
export { EMPTY_ETAPA_DOC, PROJECT_STATUS_LABEL };

// ============================================================================
// Botão de download do PDF (dynamic import — só carrega @react-pdf/renderer
// quando o usuário clica, evitando inflar o bundle inicial)
// ============================================================================

export type PdfMode = "template" | "completo" | "cliente";

export function DownloadDocPdfButton({
  project,
  clienteNome,
  mode = "completo",
  label,
  variant = "outline",
}: {
  project: Project;
  clienteNome?: string;
  mode?: PdfMode;
  label?: string;
  variant?: "outline" | "ghost" | "default";
}) {
  const [gerando, setGerando] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setGerando(true);
    try {
      const mod = await import("./_doc-pdf");
      await mod.gerarDocumentacaoPdf(project, { clienteNome, mode });
      toast.success("PDF gerado.");
    } catch (err) {
      console.error("[DownloadDocPdfButton] Falha ao gerar PDF:", err);
      const msg = err instanceof Error ? err.message : "Erro ao gerar PDF.";
      toast.error(`Erro ao gerar PDF: ${msg}`);
    } finally {
      setGerando(false);
    }
  };

  const defaultLabel =
    mode === "template"
      ? "Baixar template (escopo)"
      : mode === "cliente"
      ? "Baixar documentação (PDF)"
      : "Baixar PDF completo";

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={handleClick}
      disabled={gerando}
      className={
        variant === "outline"
          ? "border-primary/40 hover:bg-primary/10 hover:text-primary"
          : ""
      }
    >
      <FileDown className="w-4 h-4 mr-2" />
      {gerando ? "Gerando PDF..." : label ?? defaultLabel}
    </Button>
  );
}
