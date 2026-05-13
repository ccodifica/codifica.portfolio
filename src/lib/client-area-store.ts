import { supabase, ATTACHMENTS_BUCKET } from "@/lib/supabase";
import {
  ChatMessage,
  MeetingStatus,
  MessageAttachment,
  Meeting,
  Project,
  ProjectEvent,
  ProjectStatus,
  ProjectType,
  QuestionnaireData,
  User,
  UserRole,
} from "@/types/client-area";

// ============================================================================
// Constantes
// ============================================================================

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB (bate com o bucket)

export const STATUS_PROGRESS_MAP: Record<ProjectStatus, number> = {
  aguardando_analise: 5,
  briefing: 15,
  design: 35,
  desenvolvimento: 60,
  revisao: 80,
  entrega: 95,
  concluido: 100,
};

export const MEETING_STATUS_BADGES: Record<MeetingStatus, string> = {
  agendada: "bg-primary/15 text-primary border-primary/30",
  confirmada: "bg-accent/15 text-accent border-accent/30",
  realizada: "bg-success/15 text-success border-success/30",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
  remarcada: "bg-muted text-muted-foreground border-border",
};

const SIGNED_URL_EXPIRES = 60 * 60; // 1h

// ============================================================================
// Rascunho do questionário — segue em localStorage (pré-auth)
// ============================================================================

const DRAFT_KEY = "codifica_draft_questionnaire";

export function getDraftQuestionnaire(): QuestionnaireData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuestionnaireData;
  } catch {
    return null;
  }
}

export function setDraftQuestionnaire(data: QuestionnaireData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function clearDraftQuestionnaire(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

// ============================================================================
// Tipos das linhas do banco (snake_case)
// ============================================================================

interface ProfileRow {
  id: string;
  nome: string;
  email: string;
  celular: string;
  empresa: string | null;
  cargo: string | null;
  ramo: string | null;
  role: UserRole;
  created_at: string;
}

interface ProjectRow {
  id: string;
  cliente_id: string;
  nome: string;
  tipo: ProjectType;
  status: ProjectStatus;
  progresso: number;
  briefing: QuestionnaireData;
  notas_admin: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  project_id: string;
  autor_id: string;
  autor_role: UserRole;
  autor_nome: string;
  texto: string;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface MeetingRow {
  id: string;
  project_id: string;
  cliente_id: string;
  data: string;
  horario: string;
  topico: string;
  notificar_email: boolean;
  notificar_whatsapp: boolean;
  meet_link: string | null;
  status: MeetingStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  project_id: string;
  fase: ProjectStatus;
  titulo: string;
  descricao: string;
  autor_id: string;
  autor_role: UserRole;
  autor_nome: string;
  created_at: string;
}

// ============================================================================
// Mappers DB → app
// ============================================================================

function profileToUser(p: ProfileRow): User {
  return {
    id: p.id,
    nome: p.nome,
    email: p.email,
    celular: p.celular,
    empresa: p.empresa ?? undefined,
    cargo: p.cargo ?? undefined,
    ramo: p.ramo ?? undefined,
    role: p.role,
    createdAt: p.created_at,
  };
}

function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    nome: r.nome,
    tipo: r.tipo,
    status: r.status,
    progresso: r.progresso,
    briefing: r.briefing,
    notasAdmin: r.notas_admin ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToMessage(
  r: MessageRow,
  attachments: MessageAttachment[]
): ChatMessage {
  return {
    id: r.id,
    projectId: r.project_id,
    autorId: r.autor_id,
    autorRole: r.autor_role,
    autorNome: r.autor_nome,
    texto: r.texto,
    anexos: attachments.length > 0 ? attachments : undefined,
    createdAt: r.created_at,
  };
}

function rowToMeeting(r: MeetingRow): Meeting {
  return {
    id: r.id,
    projectId: r.project_id,
    clienteId: r.cliente_id,
    data: r.data,
    horario: r.horario.slice(0, 5), // "HH:MM:SS" → "HH:MM"
    topico: r.topico,
    notificarEmail: r.notificar_email,
    notificarWhatsapp: r.notificar_whatsapp,
    meetLink: r.meet_link ?? undefined,
    status: r.status,
    observacoes: r.observacoes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToEvent(r: EventRow): ProjectEvent {
  return {
    id: r.id,
    projectId: r.project_id,
    fase: r.fase,
    titulo: r.titulo,
    descricao: r.descricao,
    autorId: r.autor_id,
    autorRole: r.autor_role,
    autorNome: r.autor_nome,
    createdAt: r.created_at,
  };
}

async function signAttachment(row: AttachmentRow): Promise<MessageAttachment> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRES);
  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    data: error || !data ? "" : data.signedUrl,
  };
}

// ============================================================================
// Usuários / profiles
// ============================================================================

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProfileRow[]).map(profileToUser);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? profileToUser(data as ProfileRow) : undefined;
}

// ============================================================================
// Projetos
// ============================================================================

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProjectRow[]).map(rowToProject);
}

export async function listProjectsByCliente(
  clienteId: string
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProjectRow[]).map(rowToProject);
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProject(data as ProjectRow) : undefined;
}

export async function createProject(input: {
  clienteId: string;
  briefing: QuestionnaireData;
}): Promise<Project> {
  const nome = nomeProjetoFromBriefing(input.briefing);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      cliente_id: input.clienteId,
      nome,
      tipo: input.briefing.tipo ?? "indeciso",
      status: "aguardando_analise",
      progresso: 5,
      briefing: input.briefing,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToProject(data as ProjectRow);
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "status" | "progresso" | "nome" | "notasAdmin">>
): Promise<Project | undefined> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.progresso !== undefined) dbPatch.progresso = patch.progresso;
  if (patch.nome !== undefined) dbPatch.nome = patch.nome;
  if (patch.notasAdmin !== undefined) dbPatch.notas_admin = patch.notasAdmin;

  const { data, error } = await supabase
    .from("projects")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProject(data as ProjectRow) : undefined;
}

function nomeProjetoFromBriefing(b: QuestionnaireData): string {
  const tipoLabel: Record<string, string> = {
    site: "Site",
    ecommerce: "E-commerce",
    app: "Aplicativo",
    sistema: "Sistema",
    indeciso: "Projeto",
  };
  const tipo = b.tipo ? tipoLabel[b.tipo] : "Projeto";
  if (b.empresa) return `${tipo} — ${b.empresa}`;
  return `${tipo} — ${b.nome || "Novo cliente"}`;
}

// ============================================================================
// Mensagens + anexos
// ============================================================================

export async function listMessagesByProject(
  projectId: string
): Promise<ChatMessage[]> {
  const { data: msgs, error } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (msgs ?? []) as MessageRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((m) => m.id);
  const { data: atts, error: attErr } = await supabase
    .from("message_attachments")
    .select("*")
    .in("message_id", ids);
  if (attErr) throw attErr;
  const attRows = (atts ?? []) as AttachmentRow[];

  const grouped: Record<string, AttachmentRow[]> = {};
  for (const a of attRows) {
    (grouped[a.message_id] ??= []).push(a);
  }

  const result: ChatMessage[] = [];
  for (const m of rows) {
    const signed = await Promise.all(
      (grouped[m.id] ?? []).map(signAttachment)
    );
    result.push(rowToMessage(m, signed));
  }
  return result;
}

export async function createMessage(input: {
  projectId: string;
  autorId: string;
  autorRole: UserRole;
  autorNome: string;
  texto: string;
  anexos?: File[];
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      project_id: input.projectId,
      autor_id: input.autorId,
      autor_role: input.autorRole,
      autor_nome: input.autorNome,
      texto: input.texto,
    })
    .select("*")
    .single();
  if (error) throw error;
  const msg = data as MessageRow;

  const anexosSigned: MessageAttachment[] = [];
  if (input.anexos && input.anexos.length > 0) {
    for (const file of input.anexos) {
      try {
        const att = await uploadAttachment(file, input.projectId, msg.id);
        anexosSigned.push(att);
      } catch (err) {
        console.error("Falha ao subir anexo", file.name, err);
      }
    }
  }

  return rowToMessage(msg, anexosSigned);
}

async function uploadAttachment(
  file: File,
  projectId: string,
  messageId: string
): Promise<MessageAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Arquivo "${file.name}" excede o limite de ${Math.round(
        MAX_ATTACHMENT_BYTES / 1024 / 1024
      )} MB.`
    );
  }
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${projectId}/${messageId}/${rand}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: row, error: rowErr } = await supabase
    .from("message_attachments")
    .insert({
      message_id: messageId,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_path: path,
    })
    .select("*")
    .single();
  if (rowErr) throw rowErr;

  return signAttachment(row as AttachmentRow);
}

// ============================================================================
// Reuniões
// ============================================================================

export async function listMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("data", { ascending: true })
    .order("horario", { ascending: true });
  if (error) throw error;
  return (data as MeetingRow[]).map(rowToMeeting);
}

export async function listMeetingsByProject(
  projectId: string
): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("project_id", projectId)
    .order("data", { ascending: true })
    .order("horario", { ascending: true });
  if (error) throw error;
  return (data as MeetingRow[]).map(rowToMeeting);
}

export async function listMeetingsByCliente(
  clienteId: string
): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data", { ascending: true })
    .order("horario", { ascending: true });
  if (error) throw error;
  return (data as MeetingRow[]).map(rowToMeeting);
}

export async function createMeeting(input: {
  projectId: string;
  clienteId: string;
  data: string;
  horario: string;
  topico: string;
  notificarEmail: boolean;
  notificarWhatsapp: boolean;
}): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      project_id: input.projectId,
      cliente_id: input.clienteId,
      data: input.data,
      horario: input.horario,
      topico: input.topico,
      notificar_email: input.notificarEmail,
      notificar_whatsapp: input.notificarWhatsapp,
      status: "agendada",
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToMeeting(data as MeetingRow);
}

export async function updateMeeting(
  id: string,
  patch: Partial<
    Pick<
      Meeting,
      "status" | "meetLink" | "data" | "horario" | "topico" | "observacoes"
    >
  >
): Promise<Meeting | undefined> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.meetLink !== undefined) dbPatch.meet_link = patch.meetLink;
  if (patch.data !== undefined) dbPatch.data = patch.data;
  if (patch.horario !== undefined) dbPatch.horario = patch.horario;
  if (patch.topico !== undefined) dbPatch.topico = patch.topico;
  if (patch.observacoes !== undefined) dbPatch.observacoes = patch.observacoes;

  const { data, error } = await supabase
    .from("meetings")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMeeting(data as MeetingRow) : undefined;
}

// ============================================================================
// Eventos / log de andamento
// ============================================================================

export async function listEventsByProject(
  projectId: string
): Promise<ProjectEvent[]> {
  const { data, error } = await supabase
    .from("project_events")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as EventRow[]).map(rowToEvent);
}

export async function createEvent(input: {
  projectId: string;
  fase: ProjectStatus;
  titulo: string;
  descricao: string;
  autorId: string;
  autorRole: UserRole;
  autorNome: string;
}): Promise<ProjectEvent> {
  const { data, error } = await supabase
    .from("project_events")
    .insert({
      project_id: input.projectId,
      fase: input.fase,
      titulo: input.titulo,
      descricao: input.descricao,
      autor_id: input.autorId,
      autor_role: input.autorRole,
      autor_nome: input.autorNome,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToEvent(data as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("project_events")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
