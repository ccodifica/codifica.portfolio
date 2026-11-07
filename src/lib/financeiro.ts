import { supabase } from "@/lib/supabase";

export const DOCUMENTOS_BUCKET = "documentos";

export type TipoLancamento = "site" | "manutencao" | "sistema" | "outro";
export type FormaPagamento = "pix" | "boleto" | "cartao" | "outro";

export const TIPO_LABEL: Record<TipoLancamento, string> = {
  site: "Site",
  manutencao: "Manutenção",
  sistema: "Sistema",
  outro: "Outro",
};

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  outro: "Outro",
};

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  pedido_id: string | null;
  projeto_id: string | null;
  cliente: string;
  descricao: string | null;
  valor: number;
  forma: FormaPagamento;
  parcelas: number;
  recebido_em: string; // YYYY-MM-DD
  competencia: string | null; // YYYY-MM-01
  nota_path: string | null;
  nota_numero: string | null;
  nota_emitida_por: string | null;
  nota_emitida_em: string | null;
  created_at: string;
}

export type NovoLancamento = Omit<
  Lancamento,
  "id" | "created_at" | "nota_path" | "nota_numero" | "nota_emitida_por" | "nota_emitida_em"
>;

export interface ArquivoEntrega {
  path: string;
  nome: string;
  tamanho: number;
  em: string;
}

export interface DocumentosPedido {
  pagamentos: Pick<
    Lancamento,
    "id" | "tipo" | "descricao" | "valor" | "forma" | "parcelas" | "recebido_em" | "competencia" | "nota_path" | "nota_numero" | "nota_emitida_em"
  >[];
  entrega: ArquivoEntrega[];
  entrega_instrucoes: string | null;
}

const erro = (e: { message?: string; code?: string } | null) =>
  new Error(
    e?.code === "23505"
      ? "Esse mês de manutenção já foi registrado para este cliente."
      : e?.message?.includes("mime") || e?.message?.includes("type")
        ? "Tipo de arquivo não aceito. Use PDF, ZIP, imagem ou texto."
        : e?.message?.includes("size") || e?.message?.includes("large")
          ? "Arquivo maior que 50 MB."
          : "Algo deu errado. Tente de novo em instantes."
  );

/** Data de hoje no fuso de Brasília, YYYY-MM-DD. */
export const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export const mesISO = (d = hojeISO()) => `${d.slice(0, 7)}-01`;
export const nomeMes = (competencia: string) =>
  new Date(`${competencia}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const limparNome = (nome: string) => nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function listarLancamentos(): Promise<Lancamento[]> {
  const { data, error } = await supabase
    .from("lancamentos")
    .select("*")
    .order("recebido_em", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw erro(error);
  return (data as Lancamento[]).map((l) => ({ ...l, valor: Number(l.valor) }));
}

export async function criarLancamento(l: NovoLancamento): Promise<Lancamento> {
  const { data, error } = await supabase.from("lancamentos").insert(l).select("*").single();
  if (error) throw erro(error);
  return { ...(data as Lancamento), valor: Number((data as Lancamento).valor) };
}

export async function excluirLancamento(l: Lancamento) {
  if (l.nota_path) await supabase.storage.from(DOCUMENTOS_BUCKET).remove([l.nota_path]);
  const { error } = await supabase.from("lancamentos").delete().eq("id", l.id);
  if (error) throw erro(error);
}

export async function anexarNota(
  l: Lancamento,
  arquivo: File,
  extra: { numero?: string; emitidaPor?: string }
): Promise<Lancamento> {
  const path = `notas/${l.id}/${Date.now()}-${limparNome(arquivo.name)}`;
  const up = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(path, arquivo, { upsert: false });
  if (up.error) throw erro(up.error);
  const { data, error } = await supabase
    .from("lancamentos")
    .update({
      nota_path: path,
      nota_numero: extra.numero?.trim() || null,
      nota_emitida_por: extra.emitidaPor?.trim() || null,
      nota_emitida_em: hojeISO(),
    })
    .eq("id", l.id)
    .select("*")
    .single();
  if (error) throw erro(error);
  if (l.nota_path) await supabase.storage.from(DOCUMENTOS_BUCKET).remove([l.nota_path]);
  return { ...(data as Lancamento), valor: Number((data as Lancamento).valor) };
}

export async function enviarArquivoEntrega(pedidoId: string, atuais: ArquivoEntrega[], arquivo: File) {
  const path = `entrega/${pedidoId}/${Date.now()}-${limparNome(arquivo.name)}`;
  const up = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(path, arquivo, { upsert: false });
  if (up.error) throw erro(up.error);
  const novo: ArquivoEntrega = { path, nome: arquivo.name, tamanho: arquivo.size, em: new Date().toISOString() };
  return salvarEntrega(pedidoId, [...atuais, novo]);
}

export async function removerArquivoEntrega(pedidoId: string, atuais: ArquivoEntrega[], arquivo: ArquivoEntrega) {
  const lista = await salvarEntrega(pedidoId, atuais.filter((a) => a.path !== arquivo.path));
  await supabase.storage.from(DOCUMENTOS_BUCKET).remove([arquivo.path]);
  return lista;
}

async function salvarEntrega(pedidoId: string, entrega: ArquivoEntrega[]) {
  const { error } = await supabase.from("pedidos").update({ entrega }).eq("id", pedidoId);
  if (error) throw erro(error);
  return entrega;
}

// ---------------------------------------------------------------------------
// Cliente (pelo código do link pessoal) e admin
// ---------------------------------------------------------------------------
export async function documentosDoPedido(codigo: string): Promise<DocumentosPedido> {
  const { data, error } = await supabase.rpc("pedido_documentos", { p_codigo: codigo });
  if (error) throw erro(error);
  const d = (data || { pagamentos: [], entrega: [], entrega_instrucoes: null }) as DocumentosPedido;
  return { ...d, pagamentos: d.pagamentos.map((p) => ({ ...p, valor: Number(p.valor) })) };
}

/** Link temporário (10 min) para baixar uma nota ou arquivo de entrega. */
export async function baixarDocumento(path: string, nome?: string) {
  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(path, 600, nome ? { download: nome } : undefined);
  if (error || !data) throw erro(error);
  window.open(data.signedUrl, "_blank", "noopener");
}
