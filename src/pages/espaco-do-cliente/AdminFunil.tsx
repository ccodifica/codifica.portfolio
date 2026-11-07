import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MOTIVO_PERDA_LABEL,
  MotivoPerda,
  ORIGEM_LABEL,
  Origem,
  PEDIDO_STATUS_LABEL,
  PedidoAdmin,
  PedidoEvento,
  PedidoStatus,
  SiteEvento,
  listarEventosSite,
} from "@/lib/pedidos";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const dias = (desde: string) => Math.floor((Date.now() - new Date(desde).getTime()) / 86400000);

/** Etapas em que a bola está com o cliente: é aqui que a desistência acontece no WhatsApp. */
const ESPERANDO_CLIENTE: PedidoStatus[] = ["pre_cadastro", "previa_pronta", "aprovado", "contrato_aceito"];
const ESPERANDO_CODIFICA: PedidoStatus[] = ["recebido", "mudanca_pedida", "pago"];

const ETAPAS_PEDIDO: { status: PedidoStatus; rotulo: string }[] = [
  { status: "previa_pronta", rotulo: "Prévia enviada" },
  { status: "aprovado", rotulo: "Prévia aprovada" },
  { status: "contrato_aceito", rotulo: "Contrato aceito" },
  { status: "pago", rotulo: "Pagou" },
  { status: "no_ar", rotulo: "No ar" },
];

const Barra = ({ rotulo, valor, base, total }: { rotulo: string; valor: number; base: number; total: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span>{rotulo}</span>
      <span className="text-muted-foreground">
        <strong className="text-foreground">{valor}</strong> · {pct(valor, base)} da etapa anterior
      </span>
    </div>
    <div className="h-2.5 rounded-full bg-border overflow-hidden">
      <div className="h-full bg-primary rounded-full" style={{ width: total ? `${(valor / total) * 100}%` : 0 }} />
    </div>
  </div>
);

const Bloco = ({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
    <h2 className="text-xl font-semibold mb-1">{titulo}</h2>
    {dica && <p className="text-sm text-muted-foreground mb-4">{dica}</p>}
    {children}
  </section>
);

const zap = (numero: string, texto: string) => {
  const d = numero.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(texto)}`;
};

const AdminFunil = ({ pedidos, etapas }: { pedidos: PedidoAdmin[]; etapas: PedidoEvento[] }) => {
  const [periodo, setPeriodo] = useState(30);
  const [eventos, setEventos] = useState<SiteEvento[] | null>(null);
  const [erro, setErro] = useState("");

  const desde = useMemo(() => new Date(Date.now() - periodo * 86400000), [periodo]);

  useEffect(() => {
    setEventos(null);
    listarEventosSite(desde)
      .then(setEventos)
      .catch((e) => setErro((e as Error).message));
  }, [desde]);

  // ---- Funil do site (por sessão) ----
  const site = useMemo(() => {
    if (!eventos) return null;
    const sessoes = (ev: string) => new Set(eventos.filter((e) => e.evento === ev).map((e) => e.sessao)).size;
    const visitas = new Set(eventos.filter((e) => e.evento.startsWith("visita_")).map((e) => e.sessao)).size;
    const erros: Record<string, number> = {};
    eventos.filter((e) => e.evento === "form_erro").forEach((e) => (erros[e.detalhe || "?"] = (erros[e.detalhe || "?"] || 0) + 1));
    const campanhas: Record<string, { visitas: Set<string>; enviados: Set<string> }> = {};
    eventos.forEach((e) => {
      const c = e.utm?.utm_campaign || e.utm?.utm_source || "(direto / sem campanha)";
      campanhas[c] ??= { visitas: new Set(), enviados: new Set() };
      if (e.evento.startsWith("visita_")) campanhas[c].visitas.add(e.sessao);
      if (e.evento === "form_enviado") campanhas[c].enviados.add(e.sessao);
    });
    const porDispositivo = (d: string) => ({
      visitas: new Set(eventos.filter((e) => e.dispositivo === d && e.evento.startsWith("visita_")).map((e) => e.sessao)).size,
      enviados: new Set(eventos.filter((e) => e.dispositivo === d && e.evento === "form_enviado").map((e) => e.sessao)).size,
    });
    return {
      visitas,
      comecar: sessoes("visita_comecar"),
      inicio: sessoes("form_inicio"),
      enviado: sessoes("form_enviado"),
      whatsapp: sessoes("clique_whatsapp"),
      erros,
      campanhas,
      celular: porDispositivo("celular"),
      computador: porDispositivo("computador"),
    };
  }, [eventos]);

  // ---- Funil dos pedidos (criados no período) ----
  const doPeriodo = pedidos.filter((p) => new Date(p.created_at) >= desde);
  const atingiu = (p: PedidoAdmin, s: PedidoStatus) =>
    p.status === s || etapas.some((e) => e.pedido_id === p.id && e.para_status === s);
  const preCadastros = doPeriodo.filter((p) => etapas.some((e) => e.pedido_id === p.id && e.para_status === "pre_cadastro") || p.status === "pre_cadastro");
  const preConfirmados = preCadastros.filter((p) => atingiu(p, "recebido"));

  const ultimaMudanca = (p: PedidoAdmin) =>
    etapas.filter((e) => e.pedido_id === p.id).at(-1)?.created_at || p.created_at;

  const parados = pedidos
    .filter((p) => !["no_ar", "cancelado"].includes(p.status))
    .map((p) => ({ p, dias: dias(ultimaMudanca(p)) }))
    .sort((a, b) => b.dias - a.dias);

  const perdidos = doPeriodo.filter((p) => p.status === "cancelado");
  const motivos: Record<string, number> = {};
  const etapaDaPerda: Record<string, number> = {};
  perdidos.forEach((p) => {
    const m = p.motivo_perda ? MOTIVO_PERDA_LABEL[p.motivo_perda as MotivoPerda] : "Sem motivo registrado";
    motivos[m] = (motivos[m] || 0) + 1;
    const de = etapas.filter((e) => e.pedido_id === p.id && e.para_status === "cancelado").at(-1)?.de_status;
    const r = de ? PEDIDO_STATUS_LABEL[de] : "?";
    etapaDaPerda[r] = (etapaDaPerda[r] || 0) + 1;
  });

  const porOrigem = (Object.keys(ORIGEM_LABEL) as Origem[])
    .map((o) => {
      const lista = doPeriodo.filter((p) => p.origem === o);
      return { o, total: lista.length, pagos: lista.filter((p) => atingiu(p, "pago")).length };
    })
    .filter((x) => x.total);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={periodo === d ? "default" : "outline"} onClick={() => setPeriodo(d)}>
            {d} dias
          </Button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Bloco
          titulo="1. No site"
          dica="Pessoas (sessões) que passaram por cada passo. Visitas anônimas, sem dado pessoal."
        >
          {erro && <p className="text-destructive">{erro}</p>}
          {!site && !erro && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          {site && (
            <div className="space-y-4">
              <Barra rotulo="Visitaram alguma página da oferta" valor={site.visitas} base={site.visitas} total={site.visitas} />
              <Barra rotulo="Abriram o formulário" valor={site.comecar} base={site.visitas} total={site.visitas} />
              <Barra rotulo="Começaram a preencher" valor={site.inicio} base={site.comecar} total={site.visitas} />
              <Barra rotulo="Enviaram" valor={site.enviado} base={site.inicio} total={site.visitas} />
              <p className="text-sm text-muted-foreground">
                Clicaram no WhatsApp em vez do formulário: <strong className="text-foreground">{site.whatsapp}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Celular: {site.celular.enviados}/{site.celular.visitas} enviaram ({pct(site.celular.enviados, site.celular.visitas)}) ·
                Computador: {site.computador.enviados}/{site.computador.visitas} (
                {pct(site.computador.enviados, site.computador.visitas)})
              </p>
              {Object.keys(site.erros).length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Erros no formulário:{" "}
                  {Object.entries(site.erros)
                    .map(([k, v]) => `${k} (${v})`)
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </Bloco>

        <Bloco titulo="2. Pedidos" dica={`Pedidos criados nos últimos ${periodo} dias e até onde chegaram.`}>
          <div className="space-y-4">
            <Barra rotulo="Pedidos" valor={doPeriodo.length} base={doPeriodo.length} total={doPeriodo.length} />
            {ETAPAS_PEDIDO.map((e, i) => {
              const v = doPeriodo.filter((p) => atingiu(p, e.status)).length;
              const anterior = i === 0 ? doPeriodo.length : doPeriodo.filter((p) => atingiu(p, ETAPAS_PEDIDO[i - 1].status)).length;
              return <Barra key={e.status} rotulo={e.rotulo} valor={v} base={anterior} total={doPeriodo.length} />;
            })}
            {preCadastros.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Pré-cadastros (lead da Meta, prospecção) que confirmaram o link:{" "}
                <strong className="text-foreground">
                  {preConfirmados.length}/{preCadastros.length}
                </strong>{" "}
                ({pct(preConfirmados.length, preCadastros.length)})
              </p>
            )}
            {porOrigem.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Por origem: {porOrigem.map((x) => `${ORIGEM_LABEL[x.o]} ${x.pagos}/${x.total} pagaram`).join(" · ")}
              </p>
            )}
          </div>
        </Bloco>
      </div>

      <Bloco
        titulo="3. Onde cada pedido está parado agora"
        dica="Quando a espera é do cliente, é ali que a desistência acontece no WhatsApp. Mais de 2 dias parado: retome uma vez. Sem resposta depois disso, cancele com o motivo."
      >
        {parados.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pedido em andamento.</p>
        ) : (
          <ul className="divide-y divide-border">
            {parados.map(({ p, dias: d }) => {
              const cliente = ESPERANDO_CLIENTE.includes(p.status);
              return (
                <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.negocio}</p>
                    <p className="text-sm text-muted-foreground">
                      {PEDIDO_STATUS_LABEL[p.status]} há {d} {d === 1 ? "dia" : "dias"} ·{" "}
                      <span className={cliente ? "text-yellow-300" : ESPERANDO_CODIFICA.includes(p.status) ? "text-accent" : ""}>
                        {cliente ? "esperando o cliente" : "esperando a Codifica"}
                      </span>
                    </p>
                  </div>
                  {cliente && d >= 2 && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={zap(p.whatsapp, `Oi, ${p.nome.split(" ")[0]}! Passando para saber se ficou alguma dúvida sobre o site do ${p.negocio}. Se preferir deixar para depois, sem problema, é só me avisar.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" /> Retomar
                      </a>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Bloco>

      <Bloco
        titulo="4. Por que não fechou"
        dica="Vem do motivo escolhido ao cancelar cada pedido. É o dado mais valioso para ajustar preço e oferta."
      >
        {perdidos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pedido perdido no período.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">Motivo</p>
              <ul className="space-y-1">
                {Object.entries(motivos)
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, n]) => (
                    <li key={m} className="flex justify-between">
                      <span>{m}</span>
                      <strong>{n}</strong>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">Em que etapa desistiu</p>
              <ul className="space-y-1">
                {Object.entries(etapaDaPerda)
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, n]) => (
                    <li key={m} className="flex justify-between">
                      <span>{m}</span>
                      <strong>{n}</strong>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </Bloco>

      {site && Object.keys(site.campanhas).length > 1 && (
        <Bloco titulo="5. Por campanha" dica="Use links com ?utm_campaign=nome nos anúncios para separar aqui.">
          <ul className="divide-y divide-border text-sm">
            {Object.entries(site.campanhas)
              .sort((a, b) => b[1].visitas.size - a[1].visitas.size)
              .map(([c, v]) => (
                <li key={c} className="py-2 flex justify-between gap-4">
                  <span className="truncate">{c}</span>
                  <span className="text-muted-foreground shrink-0">
                    {v.enviados.size}/{v.visitas.size} enviaram ({pct(v.enviados.size, v.visitas.size)})
                  </span>
                </li>
              ))}
          </ul>
        </Bloco>
      )}
    </div>
  );
};

export default AdminFunil;
