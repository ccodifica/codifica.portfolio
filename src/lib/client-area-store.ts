import { supabase, ATTACHMENTS_BUCKET } from "@/lib/supabase";
import {
  cancelGoogleMeetEvent,
  createGoogleMeetEvent,
} from "@/lib/google-meet-api";
import {
  ChatMessage,
  DocumentacoesProjeto,
  EtapaDocumentacao,
  MeetingStatus,
  MessageAttachment,
  MessageReaction,
  Meeting,
  PresenceStatus,
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
  avatar_url: string | null;
  presence_status: PresenceStatus | null;
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
  documentacoes: DocumentacoesProjetoRow | null;
  created_at: string;
  updated_at: string;
}

// Schema snake_case do JSONB no banco
type DocumentacoesProjetoRow = Partial<
  Record<
    ProjectStatus,
    {
      resumo: string;
      entregaveis: string;
      pontos_atencao: string;
      proximos_passos: string;
      concluido_em?: string;
      publicado?: boolean;
    }
  >
>;

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

interface ReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
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
  participantes_extras: string[];
  meet_link: string | null;
  google_event_id: string | null;
  gravacao_url: string | null;
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
    avatarUrl: p.avatar_url ?? undefined,
    presenceStatus: p.presence_status ?? "available",
    createdAt: p.created_at,
  };
}

function rowToDocumentacoes(
  raw: DocumentacoesProjetoRow | null
): DocumentacoesProjeto {
  if (!raw) return {};
  const out: DocumentacoesProjeto = {};
  (Object.keys(raw) as ProjectStatus[]).forEach((k) => {
    const v = raw[k];
    if (!v) return;
    out[k] = {
      resumo: v.resumo ?? "",
      entregaveis: v.entregaveis ?? "",
      pontosAtencao: v.pontos_atencao ?? "",
      proximosPassos: v.proximos_passos ?? "",
      concluidoEm: v.concluido_em,
      publicado: v.publicado ?? false,
    };
  });
  return out;
}

function documentacoesToRow(
  docs: DocumentacoesProjeto
): DocumentacoesProjetoRow {
  const out: DocumentacoesProjetoRow = {};
  (Object.keys(docs) as ProjectStatus[]).forEach((k) => {
    const v = docs[k];
    if (!v) return;
    out[k] = {
      resumo: v.resumo,
      entregaveis: v.entregaveis,
      pontos_atencao: v.pontosAtencao,
      proximos_passos: v.proximosPassos,
      concluido_em: v.concluidoEm,
      publicado: v.publicado,
    };
  });
  return out;
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
    documentacoes: rowToDocumentacoes(r.documentacoes),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToReaction(r: ReactionRow): MessageReaction {
  return {
    id: r.id,
    messageId: r.message_id,
    userId: r.user_id,
    emoji: r.emoji,
    createdAt: r.created_at,
  };
}

function rowToMessage(
  r: MessageRow,
  attachments: MessageAttachment[],
  reactions: MessageReaction[] = []
): ChatMessage {
  return {
    id: r.id,
    projectId: r.project_id,
    autorId: r.autor_id,
    autorRole: r.autor_role,
    autorNome: r.autor_nome,
    texto: r.texto,
    anexos: attachments.length > 0 ? attachments : undefined,
    reactions: reactions.length > 0 ? reactions : undefined,
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
    participantesExtras: r.participantes_extras ?? [],
    meetLink: r.meet_link ?? undefined,
    googleEventId: r.google_event_id ?? undefined,
    gravacaoUrl: r.gravacao_url ?? undefined,
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

// Busca múltiplos perfis em uma única query — usado pra montar o cache de
// avatares no chat sem fazer N requests separadas.
export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data as ProfileRow[]).map(profileToUser);
}

// Atualiza o status de presença do usuário. Usado pelo hook usePresence().
export async function updatePresenceStatus(
  userId: string,
  status: PresenceStatus
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ presence_status: status })
    .eq("id", userId);
  if (error) throw error;
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
  patch: Partial<
    Pick<
      Project,
      "status" | "progresso" | "nome" | "notasAdmin" | "documentacoes"
    >
  >
): Promise<Project | undefined> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.progresso !== undefined) dbPatch.progresso = patch.progresso;
  if (patch.nome !== undefined) dbPatch.nome = patch.nome;
  if (patch.notasAdmin !== undefined) dbPatch.notas_admin = patch.notasAdmin;
  if (patch.documentacoes !== undefined) {
    dbPatch.documentacoes = documentacoesToRow(patch.documentacoes);
  }

  const { data, error } = await supabase
    .from("projects")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProject(data as ProjectRow) : undefined;
}

// Helper de conveniência: salva (ou cria) a doc de uma etapa específica.
export async function upsertEtapaDocumentacao(
  projectId: string,
  etapa: ProjectStatus,
  patch: Partial<EtapaDocumentacao>,
  currentDocs: DocumentacoesProjeto
): Promise<Project | undefined> {
  const novaEtapa: EtapaDocumentacao = {
    resumo: "",
    entregaveis: "",
    pontosAtencao: "",
    proximosPassos: "",
    publicado: false,
    ...currentDocs[etapa],
    ...patch,
  };
  const novasDocs: DocumentacoesProjeto = {
    ...currentDocs,
    [etapa]: novaEtapa,
  };
  return updateProject(projectId, { documentacoes: novasDocs });
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

  // Anexos e reações em paralelo
  const [attResult, reactResult] = await Promise.all([
    supabase.from("message_attachments").select("*").in("message_id", ids),
    supabase.from("message_reactions").select("*").in("message_id", ids),
  ]);
  if (attResult.error) throw attResult.error;
  if (reactResult.error) throw reactResult.error;

  const attRows = (attResult.data ?? []) as AttachmentRow[];
  const reactRows = (reactResult.data ?? []) as ReactionRow[];

  const attGrouped: Record<string, AttachmentRow[]> = {};
  for (const a of attRows) {
    (attGrouped[a.message_id] ??= []).push(a);
  }
  const reactGrouped: Record<string, MessageReaction[]> = {};
  for (const r of reactRows) {
    (reactGrouped[r.message_id] ??= []).push(rowToReaction(r));
  }

  const result: ChatMessage[] = [];
  for (const m of rows) {
    const signed = await Promise.all(
      (attGrouped[m.id] ?? []).map(signAttachment)
    );
    result.push(rowToMessage(m, signed, reactGrouped[m.id] ?? []));
  }
  return result;
}

// ---------- Reações ----------

/**
 * Toggle de reação. Se o user já reagiu com esse emoji nessa msg, remove.
 * Senão, adiciona. Retorna a lista atual de reactions da mensagem.
 */
export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<MessageReaction[]> {
  // Procura se já existe essa combinação
  const { data: existente, error: findError } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (findError) throw findError;

  if (existente) {
    const { error: delError } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", (existente as { id: string }).id);
    if (delError) throw delError;
  } else {
    const { error: insError } = await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: userId, emoji });
    if (insError) throw insError;
  }

  // Devolve a lista atualizada
  const { data, error } = await supabase
    .from("message_reactions")
    .select("*")
    .eq("message_id", messageId);
  if (error) throw error;
  return (data as ReactionRow[]).map(rowToReaction);
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
  participantesExtras: string[];
  // Dados usados só pra criar o evento no Google (não vão pro banco)
  clienteEmail: string;
  clienteNome: string;
  projectName?: string;
}): Promise<Meeting> {
  // 1) Insere a reunião no banco primeiro — se o Google falhar, a reunião
  //    ainda existe e o admin pode criar a sala manualmente depois.
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
      participantes_extras: input.participantesExtras,
      status: "agendada",
    })
    .select("*")
    .single();
  if (error) throw error;
  const meeting = rowToMeeting(data as MeetingRow);

  // 2) Tenta criar o evento no Google Calendar (com sala do Meet) via Edge Function.
  try {
    const { meetLink, eventId } = await createGoogleMeetEvent({
      data: input.data,
      horario: input.horario,
      topico: input.topico,
      clienteEmail: input.clienteEmail,
      clienteNome: input.clienteNome,
      participantesExtras: input.participantesExtras,
      projectName: input.projectName,
    });

    const { data: updated, error: updateError } = await supabase
      .from("meetings")
      .update({ meet_link: meetLink, google_event_id: eventId })
      .eq("id", meeting.id)
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;
    return updated ? rowToMeeting(updated as MeetingRow) : meeting;
  } catch (err) {
    // Reunião no banco está OK; só não temos o Meet ainda. Admin pode resolver.
    console.warn(
      "[createMeeting] Falha ao criar evento no Google. Reunião salva sem meet_link.",
      err
    );
    return meeting;
  }
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

  // Se está cancelando, precisamos do google_event_id pra deletar a sala no Google.
  // Lê antes do update porque o id do evento já não muda mais.
  let googleEventIdToCancel: string | null = null;
  if (patch.status === "cancelada") {
    const { data: existing } = await supabase
      .from("meetings")
      .select("google_event_id")
      .eq("id", id)
      .maybeSingle();
    googleEventIdToCancel =
      (existing as { google_event_id: string | null } | null)?.google_event_id ?? null;
  }

  const { data, error } = await supabase
    .from("meetings")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  // Cancelamento idempotente — se o Google falhar a reunião continua marcada
  // como cancelada no banco. Admin pode limpar o evento manualmente se preciso.
  if (googleEventIdToCancel) {
    try {
      await cancelGoogleMeetEvent(googleEventIdToCancel);
    } catch (err) {
      console.warn(
        "[updateMeeting] Falha ao cancelar evento no Google. Status no banco já está 'cancelada'.",
        err
      );
    }
  }

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

// ============================================================================
// Avatares (foto de perfil)
// ============================================================================

const AVATARS_BUCKET = "avatars";

/**
 * Sobe o blob da foto de perfil no Storage, atualiza `profiles.avatar_url`
 * e devolve o novo profile. O blob deve já ter sido cropado/redimensionado
 * no cliente — geralmente um JPG quadrado de 512×512.
 *
 * Estratégia de cache-busting: usa timestamp no nome do arquivo (não dá
 * pra confiar só na URL pública; o Supabase usa o mesmo path).
 */
export async function uploadUserAvatar(
  userId: string,
  blob: Blob
): Promise<User> {
  const timestamp = Date.now();
  const path = `${userId}/${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);

  // Antes de atualizar o profile, vamos remover o avatar antigo (se houver)
  // pra não acumular lixo no bucket. Falha silenciosa se não conseguir.
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle();
    const antigaUrl = (existing as { avatar_url: string | null } | null)
      ?.avatar_url;
    if (antigaUrl) {
      const antigaPath = extractAvatarPath(antigaUrl);
      if (antigaPath && antigaPath !== path) {
        await supabase.storage.from(AVATARS_BUCKET).remove([antigaPath]);
      }
    }
  } catch (err) {
    console.warn("[uploadUserAvatar] Falha ao remover avatar antigo:", err);
  }

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)
    .select("*")
    .single();
  if (updateError) throw updateError;

  return profileToUser(data as ProfileRow);
}

/**
 * Remove o avatar do usuário (apaga do storage + limpa profile).
 */
export async function removeUserAvatar(userId: string): Promise<User> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  const antigaUrl = (existing as { avatar_url: string | null } | null)
    ?.avatar_url;

  if (antigaUrl) {
    const antigaPath = extractAvatarPath(antigaUrl);
    if (antigaPath) {
      try {
        await supabase.storage.from(AVATARS_BUCKET).remove([antigaPath]);
      } catch (err) {
        console.warn("[removeUserAvatar] Falha ao remover do storage:", err);
      }
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return profileToUser(data as ProfileRow);
}

/**
 * Extrai o path interno do bucket a partir da URL pública.
 * URL típica: https://<proj>.supabase.co/storage/v1/object/public/avatars/<uid>/<file>.jpg
 */
function extractAvatarPath(publicUrl: string): string | null {
  const marker = `/object/public/${AVATARS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
