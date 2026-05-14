import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  Project,
  ProjectStatus,
} from "@/types/client-area";
import { ETAPA_GUIDE } from "@/lib/etapa-guide";

// ============================================================================
// Estilos (paleta da Codifica — roxo/azul, fundo claro pra impressão)
// ============================================================================

const CODIFICA = {
  primary: "#8B3DF5",
  accent: "#00BFFF",
  dark: "#0F0E17",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  bgLight: "#F9FAFB",
  bgPrimary: "#F5EEFE",
  success: "#10B981",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 10,
    color: CODIFICA.textPrimary,
    fontFamily: "Helvetica",
  },

  // Header com gradiente simulado por barra colorida
  headerBar: {
    height: 6,
    backgroundColor: CODIFICA.primary,
    marginBottom: 20,
    marginHorizontal: -40,
    marginTop: -40,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 16,
    borderBottom: `1pt solid ${CODIFICA.border}`,
  },

  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: CODIFICA.primary,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },

  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: CODIFICA.dark,
  },

  brandTagline: {
    fontSize: 9,
    color: CODIFICA.textSecondary,
    marginTop: 2,
  },

  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: CODIFICA.dark,
    marginBottom: 6,
  },

  docSubtitle: {
    fontSize: 11,
    color: CODIFICA.textSecondary,
    marginBottom: 24,
  },

  // Card de info do projeto
  projectCard: {
    backgroundColor: CODIFICA.bgPrimary,
    borderRadius: 6,
    padding: 16,
    marginBottom: 28,
    borderLeft: `3pt solid ${CODIFICA.primary}`,
  },

  projectCardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: CODIFICA.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  projectCardValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: CODIFICA.dark,
    marginBottom: 10,
  },

  metaRow: {
    flexDirection: "row",
    gap: 24,
  },

  metaItem: {
    flex: 1,
  },

  metaLabel: {
    fontSize: 8,
    color: CODIFICA.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  metaValue: {
    fontSize: 10,
    color: CODIFICA.textPrimary,
    fontFamily: "Helvetica-Bold",
  },

  // Cada etapa
  etapaSection: {
    marginBottom: 22,
    paddingBottom: 18,
    borderBottom: `1pt dashed ${CODIFICA.border}`,
  },

  etapaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  etapaNumero: {
    width: 24,
    height: 24,
    backgroundColor: CODIFICA.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  etapaNumeroPendente: {
    backgroundColor: CODIFICA.border,
  },

  etapaNumeroText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },

  etapaTitulo: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: CODIFICA.dark,
  },

  etapaBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  badgeConcluida: {
    backgroundColor: CODIFICA.success,
    color: "#FFFFFF",
  },

  badgeAtual: {
    backgroundColor: CODIFICA.primary,
    color: "#FFFFFF",
  },

  badgePendente: {
    backgroundColor: CODIFICA.border,
    color: CODIFICA.textSecondary,
  },

  etapaDescricao: {
    fontSize: 9.5,
    color: CODIFICA.textSecondary,
    marginBottom: 12,
    paddingLeft: 34,
    fontStyle: "italic",
  },

  campoBox: {
    marginTop: 10,
    paddingLeft: 34,
  },

  campoLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: CODIFICA.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  campoValor: {
    fontSize: 10,
    color: CODIFICA.textPrimary,
    lineHeight: 1.4,
  },

  campoVazio: {
    fontSize: 9,
    color: CODIFICA.textMuted,
    fontStyle: "italic",
  },

  vazioBox: {
    paddingLeft: 34,
    paddingVertical: 8,
    fontSize: 9,
    color: CODIFICA.textMuted,
    fontStyle: "italic",
  },

  concluidoEm: {
    fontSize: 8,
    color: CODIFICA.success,
    paddingLeft: 34,
    marginTop: 8,
    fontFamily: "Helvetica-Bold",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTop: `1pt solid ${CODIFICA.border}`,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: CODIFICA.textMuted,
  },

  pageNumber: {
    fontSize: 8,
    color: CODIFICA.textMuted,
  },
});

// ============================================================================
// Helpers
// ============================================================================

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function getEstado(
  etapa: ProjectStatus,
  projectStatus: ProjectStatus,
  concluidoEm?: string
): "concluida" | "atual" | "pendente" {
  if (concluidoEm) return "concluida";
  if (etapa === projectStatus) return "atual";
  return "pendente";
}

const ESTADO_LABEL = {
  concluida: "Concluída",
  atual: "Em andamento",
  pendente: "Pendente",
};

// ============================================================================
// Componente do PDF
// ============================================================================

export type PdfMode = "template" | "completo" | "cliente";

interface DocumentacaoPDFProps {
  project: Project;
  clienteNome?: string;
  mode: PdfMode;
}

const DocumentacaoPDF = ({
  project,
  clienteNome,
  mode,
}: DocumentacaoPDFProps) => (
  <Document
    title={`Documentação - ${project.nome}`}
    author="Codifica"
    creator="Codifica - Espaço do Cliente"
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBar} fixed />

      <View style={styles.brandRow} fixed>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>{"<>"}</Text>
        </View>
        <View>
          <Text style={styles.brandName}>Codifica</Text>
          <Text style={styles.brandTagline}>
            Desenvolvimento web, mobile e sistemas sob medida
          </Text>
        </View>
      </View>

      <Text style={styles.docTitle}>
        {mode === "template"
          ? "Documentação do projeto — Template"
          : "Documentação do projeto"}
      </Text>
      <Text style={styles.docSubtitle}>
        {mode === "template"
          ? "Estrutura padrão de documentação por etapa. Material interno para preenchimento."
          : "Registro detalhado de cada etapa do desenvolvimento."}
        {" Gerado em "}
        {new Date().toLocaleDateString("pt-BR")}.
      </Text>

      <View style={styles.projectCard}>
        <Text style={styles.projectCardLabel}>Projeto</Text>
        <Text style={styles.projectCardValue}>{project.nome}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text style={styles.metaValue}>{clienteNome ?? "—"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Etapa atual</Text>
            <Text style={styles.metaValue}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Progresso</Text>
            <Text style={styles.metaValue}>{project.progresso}%</Text>
          </View>
        </View>
      </View>

      {PROJECT_STATUS_ORDER.map((etapa, idx) => {
        const guide = ETAPA_GUIDE[etapa];
        const doc = project.documentacoes[etapa];
        const estado = getEstado(etapa, project.status, doc?.concluidoEm);

        // No modo template, ignoramos os dados preenchidos — gera estrutura limpa.
        // No modo cliente, só consideramos campos se a etapa estiver publicada.
        const ignoraConteudo =
          mode === "template" || (mode === "cliente" && !doc?.publicado);

        const numeroStyle =
          estado === "pendente"
            ? [styles.etapaNumero, styles.etapaNumeroPendente]
            : styles.etapaNumero;
        const badgeStyle =
          estado === "concluida"
            ? [styles.etapaBadge, styles.badgeConcluida]
            : estado === "atual"
            ? [styles.etapaBadge, styles.badgeAtual]
            : [styles.etapaBadge, styles.badgePendente];

        const temConteudo =
          !ignoraConteudo &&
          Boolean(
            doc?.resumo ||
              doc?.entregaveis ||
              doc?.pontosAtencao ||
              doc?.proximosPassos
          );

        return (
          <View key={etapa} style={styles.etapaSection} wrap={false}>
            <View style={styles.etapaHeader}>
              <View style={numeroStyle}>
                <Text style={styles.etapaNumeroText}>{idx + 1}</Text>
              </View>
              <Text style={styles.etapaTitulo}>{guide.titulo}</Text>
              {mode !== "template" && (
                <Text style={badgeStyle}>{ESTADO_LABEL[estado]}</Text>
              )}
            </View>

            <Text style={styles.etapaDescricao}>{guide.descricao}</Text>

            {/* Modo template: inclui o checklist do que a Codifica faz e do
                que precisa pra finalizar — material de referência. */}
            {mode === "template" && (
              <View style={styles.campoBox}>
                <Text style={styles.campoLabel}>O que a Codifica faz</Text>
                {guide.oQueFazemos.map((item, i) => (
                  <Text key={i} style={styles.campoValor}>
                    · {item}
                  </Text>
                ))}
                <Text style={[styles.campoLabel, { marginTop: 8 }]}>
                  Pra finalizar a etapa
                </Text>
                {guide.paraFinalizar.map((item, i) => (
                  <Text key={i} style={styles.campoValor}>
                    · {item}
                  </Text>
                ))}
              </View>
            )}

            {temConteudo ? (
              <>
                {doc?.resumo && (
                  <View style={styles.campoBox}>
                    <Text style={styles.campoLabel}>
                      Resumo do que foi feito
                    </Text>
                    <Text style={styles.campoValor}>{doc.resumo}</Text>
                  </View>
                )}
                {doc?.entregaveis && (
                  <View style={styles.campoBox}>
                    <Text style={styles.campoLabel}>
                      Entregáveis / Pontos validados
                    </Text>
                    <Text style={styles.campoValor}>{doc.entregaveis}</Text>
                  </View>
                )}
                {doc?.pontosAtencao && (
                  <View style={styles.campoBox}>
                    <Text style={styles.campoLabel}>Pontos de atenção</Text>
                    <Text style={styles.campoValor}>{doc.pontosAtencao}</Text>
                  </View>
                )}
                {doc?.proximosPassos && (
                  <View style={styles.campoBox}>
                    <Text style={styles.campoLabel}>Próximos passos</Text>
                    <Text style={styles.campoValor}>{doc.proximosPassos}</Text>
                  </View>
                )}
                {doc?.concluidoEm && (
                  <Text style={styles.concluidoEm}>
                    Etapa concluida em {formatDate(doc.concluidoEm)}
                  </Text>
                )}
              </>
            ) : mode === "template" ? null : (
              <Text style={styles.vazioBox}>
                {mode === "cliente" && !doc?.publicado
                  ? "Documentação em preparação pela equipe da Codifica."
                  : "Esta etapa ainda não tem documentação publicada."}
              </Text>
            )}
          </View>
        );
      })}

      <View style={styles.footer} fixed>
        <Text>
          Codifica · Rio de Janeiro · Brasil · ccodifica@gmail.com
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  </Document>
);

// ============================================================================
// Função pública: gera o PDF e dispara o download
// ============================================================================

export async function gerarDocumentacaoPdf(
  project: Project,
  opts: { clienteNome?: string; mode?: PdfMode } = {}
): Promise<void> {
  const mode = opts.mode ?? "completo";
  const blob = await pdf(
    <DocumentacaoPDF
      project={project}
      clienteNome={opts.clienteNome}
      mode={mode}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  const safeName =
    project.nome.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "projeto";
  const data = new Date().toISOString().slice(0, 10);
  const sufixo =
    mode === "template" ? "Template" : mode === "cliente" ? "Cliente" : "Completo";
  a.download = `Codifica - Documentacao - ${sufixo} - ${safeName} - ${data}.pdf`;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
