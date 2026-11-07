import { supabase } from "@/lib/supabase";
import { registrar, utmDaSessao } from "@/lib/metricas";
import type { ArquivoEntrega } from "@/lib/financeiro";

export const PEDIDOS_BUCKET = "pedidos";

export type PedidoStatus =
  | "pre_cadastro"
  | "recebido"
  | "previa_pronta"
  | "mudanca_pedida"
  | "aprovado"
  | "contrato_aceito"
  | "pago"
  | "no_ar"
  | "cancelado";

export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  pre_cadastro: "Pré-cadastro",
  recebido: "Montando prévia",
  previa_pronta: "Prévia pronta",
  mudanca_pedida: "Mudança pedida",
  aprovado: "Prévia aprovada",
  contrato_aceito: "Aguardando pagamento",
  pago: "Em produção",
  no_ar: "No ar",
  cancelado: "Cancelado",
};

export type SimNao = "sim" | "nao" | "nao_sei";
export type Origem = "site" | "meta" | "prospeccao" | "indicacao" | "outro";

export const ORIGEM_LABEL: Record<Origem, string> = {
  site: "Site",
  meta: "Anúncio (Meta)",
  prospeccao: "Prospecção",
  indicacao: "Indicação",
  outro: "Outro",
};

export interface Redes {
  instagram?: string;
  facebook?: string;
  google?: string;
  tiktok?: string;
  outro?: string;
  nenhuma?: boolean;
}

export const REDES_LISTA: { chave: Exclude<keyof Redes, "nenhuma">; rotulo: string; dica: string }[] = [
  { chave: "instagram", rotulo: "Instagram", dica: "@seunegocio ou link" },
  { chave: "facebook", rotulo: "Facebook", dica: "Link da página" },
  { chave: "google", rotulo: "Perfil no Google (Maps)", dica: "Link ou o nome como aparece na busca" },
  { chave: "tiktok", rotulo: "TikTok", dica: "@seunegocio" },
  { chave: "outro", rotulo: "Outro", dica: "iFood, LinkedIn, Linktree, catálogo do WhatsApp..." },
];

export interface DadosPedido {
  nome: string;
  email: string;
  whatsapp: string;
  negocio: string;
  cidade: string;
  redes: Redes;
  site_atual?: string;
  referencia?: string;
  aparece_maps?: SimNao | "";
  precisa_sistema?: SimNao | "";
}

export const DADOS_VAZIOS: DadosPedido = {
  nome: "",
  email: "",
  whatsapp: "",
  negocio: "",
  cidade: "",
  redes: {},
  site_atual: "",
  referencia: "",
  aparece_maps: "",
  precisa_sistema: "",
};

export interface PedidoPublico extends DadosPedido {
  codigo: string;
  status: PedidoStatus;
  previa_url: string | null;
  previa_aprovada_em: string | null;
  previa_aprovada_por: "cliente_site" | "admin_whatsapp" | null;
  mudancas_usadas: number;
  mudanca_texto: string | null;
  contrato_versao: string | null;
  contrato_aceito_em: string | null;
  contrato_nome: string | null;
  pagamento_status: "pendente" | "aguardando" | "pago" | "estornado";
  pagamento_link: string | null;
  pago_em: string | null;
  site_url: string | null;
  manutencao_status: "ativa" | "cancelada";
  manutencao_cancelada_em: string | null;
  arquivos: { nome: string; em: string }[];
  /** se a Codifica já administra o Perfil do Google do cliente */
  perfil_acesso?: PerfilAcesso | null;
  /** avaliação do cliente depois que o site foi ao ar */
  avaliacao?: { nota: number; comentario: string | null } | null;
  /** datas de cada mudança de etapa (vem do pedido_eventos) */
  historico?: { status: PedidoStatus; em: string }[];
  created_at: string;
}

export type MotivoPerda =
  | "sumiu_sem_responder"
  | "preco"
  | "nao_gostou_previa"
  | "ja_tem_site"
  | "nao_e_o_momento"
  | "queria_sistema"
  | "fechou_com_outro"
  | "outro";

export const MOTIVO_PERDA_LABEL: Record<MotivoPerda, string> = {
  sumiu_sem_responder: "Sumiu sem responder",
  preco: "Achou caro",
  nao_gostou_previa: "Não gostou da prévia",
  ja_tem_site: "Já tem site / não precisa",
  nao_e_o_momento: "Não é o momento",
  queria_sistema: "Queria um sistema",
  fechou_com_outro: "Fechou com outro",
  outro: "Outro",
};

export interface PedidoAdmin extends PedidoPublico {
  id: string;
  origem: Origem;
  manutencao_cancelada_por: "cliente_site" | "admin_whatsapp" | null;
  manutencao_motivo: string | null;
  motivo_perda: MotivoPerda | null;
  motivo_perda_detalhe: string | null;
  utm: Record<string, string>;
  contrato_nome: string | null;
  contrato_documento: string | null;
  arquivos: { nome: string; em: string; path: string; tamanho: number }[];
  entrega: ArquivoEntrega[];
  entrega_instrucoes: string | null;
  notas_admin: string | null;
  perfil_acesso_em?: string | null;
  updated_at: string;
}

const MENSAGENS_ERRO: Record<string, string> = {
  campo_obrigatorio: "Preencha os campos obrigatórios.",
  email_invalido: "Confira o e-mail.",
  campo_longo_demais: "Algum campo ficou longo demais.",
  etapa_invalida: "Essa ação não está disponível nesta etapa. Atualize a página.",
  mudanca_ja_usada: "A mudança da prévia já foi usada. Os próximos ajustes entram depois do pagamento.",
  documento_invalido: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
  cep_invalido: "Confira o CEP (8 números).",
  caminho_invalido: "Não foi possível registrar o arquivo.",
};

function traduzErro(e: { message?: string } | null): Error {
  const chave = Object.keys(MENSAGENS_ERRO).find((k) => e?.message?.includes(k));
  return new Error(chave ? MENSAGENS_ERRO[chave] : "Algo deu errado. Tente de novo em instantes.");
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw traduzErro(error);
  return data as T;
}

export const criarPedido = async (dados: DadosPedido) => {
  const codigo = await rpc<string>("pedido_criar", { dados: { ...dados, utm: utmDaSessao() } });
  registrar("form_enviado");
  return codigo;
};

/** Pedidos do e-mail logado (área do cliente). */
export const meusPedidos = () => rpc<PedidoPublico[]>("meus_pedidos", {});

export const verPedido =(codigo: string) => rpc<PedidoPublico | null>("pedido_ver", { p_codigo: codigo });

export const confirmarPedido = (codigo: string, dados: DadosPedido) =>
  rpc<PedidoPublico>("pedido_confirmar", { p_codigo: codigo, dados });

export const responderPrevia = (codigo: string, aprova: boolean, texto = "") =>
  rpc<PedidoPublico>("pedido_responder_previa", { p_codigo: codigo, p_aprova: aprova, p_texto: texto });

export const aceitarContrato = (
  codigo: string,
  nome: string,
  documento: string,
  versao: string,
  email: string,
  endereco: { cep: string; numero: string; complemento: string }
) =>
  rpc<PedidoPublico>("pedido_aceitar_contrato", {
    p_codigo: codigo,
    p_nome: nome,
    p_documento: documento,
    p_versao: versao,
    p_user_agent: navigator.userAgent,
    p_email: email,
    p_cep: endereco.cep,
    p_numero: endereco.numero,
    p_complemento: endereco.complemento,
  });

/** Conta que o cliente adiciona como administradora do Perfil do Google dele. */
export const EMAIL_PERFIL_CODIFICA = "ccodifica@gmail.com";
/** Situação do acesso ao Perfil do cliente, marcada pela equipe (o pedido é feito pelo WhatsApp). */
export type PerfilAcesso = "convite_enviado" | "sem_perfil" | "confirmado";

export const avaliarPedido = (codigo: string, nota: number, comentario: string, podePublicar: boolean) =>
  rpc<PedidoPublico>("pedido_avaliar", { p_codigo: codigo, p_nota: nota, p_comentario: comentario, p_pode_publicar: podePublicar });

export type FormaPagamentoSite = "pix" | "boleto" | "cartao";
export type CobrancaGerada =
  | { forma: "pix"; valor: number; qr: string; copiaECola: string; expiraEm: string }
  | { forma: "boleto"; valor: number; url: string }
  | { forma: "cartao"; valor: number; url: string; parcelas: number };

/** Gera (ou reaproveita) a cobrança no Asaas pela Edge Function. */
export async function gerarPagamento(codigo: string, forma: FormaPagamentoSite, parcelas = 1): Promise<CobrancaGerada> {
  const { data, error } = await supabase.functions.invoke("asaas-pagamento", { body: { codigo, forma, parcelas } });
  if (error || !data || data.erro) {
    let codigoErro = data?.erro as string | undefined;
    try {
      codigoErro ||= (await (error as { context?: Response })?.context?.json())?.erro;
    } catch {
      /* corpo vazio */
    }
    if (codigoErro === "etapa_invalida") throw new Error("Esse pagamento já não está disponível. Atualize a página.");
    if (codigoErro === "documento_invalido") throw new Error("O CPF ou CNPJ do contrato parece incompleto. Fale com a gente no WhatsApp.");
    throw new Error("Não conseguimos gerar o pagamento agora. Tente de novo em instantes ou fale com a gente.");
  }
  return data as CobrancaGerada;
}

export const cancelarManutencao =(codigo: string, motivo = "") =>
  rpc<PedidoPublico>("pedido_cancelar_manutencao", { p_codigo: codigo, p_motivo: motivo });

export async function enviarArquivo(codigo: string, arquivo: File): Promise<PedidoPublico> {
  const nomeLimpo = arquivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${codigo}/${Date.now()}-${nomeLimpo}`;
  const { error } = await supabase.storage.from(PEDIDOS_BUCKET).upload(path, arquivo, { upsert: false });
  if (error) {
    throw new Error(
      error.message?.includes("size")
        ? "Arquivo maior que 10 MB."
        : "Não foi possível enviar o arquivo. Use PNG, JPG, WEBP, SVG ou PDF."
    );
  }
  return rpc<PedidoPublico>("pedido_registrar_arquivo", {
    p_codigo: codigo,
    p_path: path,
    p_nome: arquivo.name,
    p_tamanho: arquivo.size,
  });
}

// ---------------------------------------------------------------------------
// Admin (RLS: só role = admin)
// ---------------------------------------------------------------------------

export async function listarPedidos(): Promise<PedidoAdmin[]> {
  const { data, error } = await supabase.from("pedidos").select("*").order("created_at", { ascending: false });
  if (error) throw traduzErro(error);
  return data as PedidoAdmin[];
}

export async function criarPreCadastro(dados: DadosPedido & { origem: Origem }): Promise<PedidoAdmin> {
  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      ...dados,
      email: dados.email.trim().toLowerCase() || null,
      aparece_maps: dados.aparece_maps || null,
      precisa_sistema: dados.precisa_sistema || null,
      status: "pre_cadastro",
    })
    .select("*")
    .single();
  if (error) throw traduzErro(error);
  return data as PedidoAdmin;
}

export async function atualizarPedido(id: string, campos: Partial<PedidoAdmin>): Promise<PedidoAdmin> {
  const { data, error } = await supabase.from("pedidos").update(campos).eq("id", id).select("*").single();
  if (error) throw traduzErro(error);
  return data as PedidoAdmin;
}

export async function urlArquivo(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(PEDIDOS_BUCKET).createSignedUrl(path, 600);
  if (error || !data) throw traduzErro(error);
  return data.signedUrl;
}

export interface PedidoEvento {
  pedido_id: string;
  de_status: PedidoStatus | null;
  para_status: PedidoStatus;
  created_at: string;
}

export interface SiteEvento {
  sessao: string;
  evento: string;
  pagina: string | null;
  detalhe: string | null;
  utm: Record<string, string>;
  dispositivo: "celular" | "computador" | null;
  created_at: string;
}

export async function listarEtapasPedidos(): Promise<PedidoEvento[]> {
  const { data, error } = await supabase
    .from("pedido_eventos")
    .select("pedido_id, de_status, para_status, created_at")
    .order("created_at", { ascending: true });
  if (error) throw traduzErro(error);
  return data as PedidoEvento[];
}

export async function listarEventosSite(desde: Date): Promise<SiteEvento[]> {
  const todos: SiteEvento[] = [];
  // paginação: o Supabase devolve no máximo 1000 linhas por consulta
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("site_eventos")
      .select("sessao, evento, pagina, detalhe, utm, dispositivo, created_at")
      .gte("created_at", desde.toISOString())
      .order("created_at", { ascending: true })
      .range(de, de + 999);
    if (error) throw traduzErro(error);
    todos.push(...(data as SiteEvento[]));
    if (!data || data.length < 1000) break;
  }
  return todos;
}

export const linkPedido =(codigo: string) => `${window.location.origin}/pedido/${codigo}`;
