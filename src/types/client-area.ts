export type UserRole = "cliente" | "admin";

export type PresenceStatus = "available" | "away" | "busy";

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  available: "Disponível",
  away: "Ausente",
  busy: "Ocupado",
};

export interface User {
  id: string;
  nome: string;
  email: string;
  celular: string;
  empresa?: string;
  cargo?: string;
  ramo?: string;
  role: UserRole;
  avatarUrl?: string;
  presenceStatus: PresenceStatus;
  createdAt: string;
}

export type ProjectType =
  | "site"
  | "ecommerce"
  | "app"
  | "sistema"
  | "indeciso";

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  site: "Site / Landing page",
  ecommerce: "E-commerce",
  app: "Aplicativo mobile",
  sistema: "Sistema web",
  indeciso: "Ainda não sei",
};

export type ProjectStatus =
  | "aguardando_analise"
  | "briefing"
  | "design"
  | "desenvolvimento"
  | "revisao"
  | "entrega"
  | "concluido";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  aguardando_analise: "Aguardando análise",
  briefing: "Briefing",
  design: "Design",
  desenvolvimento: "Desenvolvimento",
  revisao: "Revisão",
  entrega: "Entrega",
  concluido: "Concluído",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "aguardando_analise",
  "briefing",
  "design",
  "desenvolvimento",
  "revisao",
  "entrega",
  "concluido",
];

export interface MeetingPreference {
  quer: boolean;
  data?: string; // YYYY-MM-DD
  horario?: string; // HH:mm
  topico?: string;
  notificarEmail: boolean;
  notificarWhatsapp: boolean;
}

export interface QuestionnaireData {
  // Passo 1 — Sobre você
  nome: string;
  email: string;
  celular: string;
  empresa?: string;
  cargo?: string;
  ramo?: string;

  // Passo 2 — Tipo
  tipo: ProjectType | null;

  // Passo 3 — Objetivo
  objetivoFrase: string;
  entregas: string[];
  publicoAlvo: string;

  // Passo 4 — Técnicos (varia por tipo)
  detalhesTecnicos: Record<string, string | string[] | boolean>;

  // Passo 5 — Identidade
  temIdentidade: "sim" | "nao" | "parcial" | "";
  temDominio: "sim" | "nao" | "nao_sei" | "";
  referencias: string;
  estiloDesejado: string;

  // Passo 6 — Prazo e investimento
  prazo: string;
  orcamento: string;
  comoConheceu: string;

  // Passo 7 — Reunião (em todas as ramificações)
  reuniao: MeetingPreference;
}

export const EMPTY_QUESTIONNAIRE: QuestionnaireData = {
  nome: "",
  email: "",
  celular: "",
  empresa: "",
  cargo: "",
  ramo: "",
  tipo: null,
  objetivoFrase: "",
  entregas: [],
  publicoAlvo: "",
  detalhesTecnicos: {},
  temIdentidade: "",
  temDominio: "",
  referencias: "",
  estiloDesejado: "",
  prazo: "",
  orcamento: "",
  comoConheceu: "",
  reuniao: {
    quer: false,
    notificarEmail: true,
    notificarWhatsapp: false,
  },
};

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string; // mime type (image/png, application/pdf, ...)
  fileSize: number; // bytes
  data: string; // data URL base64 (Fase 1A); na Fase 1B virará URL do Storage
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  autorId: string;
  autorRole: UserRole;
  autorNome: string;
  texto: string;
  anexos?: MessageAttachment[];
  reactions?: MessageReaction[];
  createdAt: string;
}

export type MeetingStatus =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "remarcada";

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  remarcada: "Remarcada",
};

export interface Meeting {
  id: string;
  projectId: string;
  clienteId: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  topico: string;
  notificarEmail: boolean;
  notificarWhatsapp: boolean;
  participantesExtras: string[]; // emails extras convidados; Codifica é incluída no backend
  meetLink?: string;
  googleEventId?: string; // id do evento no Google Calendar (para update/cancel)
  gravacaoUrl?: string; // link da gravação (Drive/Loom/upload manual) — preenchido pelo admin
  status: MeetingStatus;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEvent {
  id: string;
  projectId: string;
  fase: ProjectStatus;
  titulo: string;
  descricao: string;
  autorId: string;
  autorRole: UserRole;
  autorNome: string;
  createdAt: string;
}

export interface EtapaDocumentacao {
  resumo: string;
  entregaveis: string;
  pontosAtencao: string;
  proximosPassos: string;
  concluidoEm?: string; // ISO date — auto-preenchido quando admin avança a fase
  publicado: boolean; // false = rascunho do admin; true = visível ao cliente
}

export type DocumentacoesProjeto = Partial<
  Record<ProjectStatus, EtapaDocumentacao>
>;

export const EMPTY_ETAPA_DOC: EtapaDocumentacao = {
  resumo: "",
  entregaveis: "",
  pontosAtencao: "",
  proximosPassos: "",
  publicado: false,
};

export interface Project {
  id: string;
  clienteId: string;
  nome: string;
  tipo: ProjectType;
  status: ProjectStatus;
  progresso: number; // 0-100
  briefing: QuestionnaireData;
  notasAdmin?: string;
  documentacoes: DocumentacoesProjeto;
  createdAt: string;
  updatedAt: string;
}
