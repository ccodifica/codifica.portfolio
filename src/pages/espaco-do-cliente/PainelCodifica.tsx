import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Globe,
  Loader2,
  Wallet,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import {
  PedidoAdmin,
  PedidoEvento,
  listarEtapasPedidos,
  listarPedidos,
} from "@/lib/pedidos";
import { listMeetings, listProjects, listUsers } from "@/lib/client-area-store";
import {
  Meeting,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  Project,
  User,
} from "@/types/client-area";
import AbaSites from "./AbaSites";
import AbaSistemas from "./AbaSistemas";
import AdminFunil from "./AdminFunil";
import AbaFinanceiro from "./AbaFinanceiro";
import AbaMetricas from "./AbaMetricas";

type Aba = "sites" | "sistemas" | "financeiro" | "metricas";

const ABAS: { id: Aba; rotulo: string; icone: typeof Globe }[] = [
  { id: "sites", rotulo: "Sites", icone: Globe },
  { id: "sistemas", rotulo: "Sistemas", icone: Workflow },
  { id: "financeiro", rotulo: "Financeiro", icone: Wallet },
  { id: "metricas", rotulo: "Métricas", icone: Activity },
];

/** Painel único da equipe: sites, sistemas e métricas no mesmo lugar. */
const PainelCodifica = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const aba = (
    ABAS.some((a) => a.id === params.get("aba")) ? params.get("aba") : "sites"
  ) as Aba;

  const [pedidos, setPedidos] = useState<PedidoAdmin[] | null>(null);
  const [etapas, setEtapas] = useState<PedidoEvento[]>([]);
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [erro, setErro] = useState("");

  const carregarSites = useCallback(
    () =>
      Promise.all([listarPedidos(), listarEtapasPedidos()]).then(([p, e]) => {
        setPedidos(p);
        setEtapas(e);
      }),
    [],
  );

  const carregarSistemas = useCallback(
    () =>
      Promise.all([listProjects(), listUsers(), listMeetings()]).then(
        ([pr, us, mt]) => {
          setProjetos(pr);
          setUsuarios(us);
          setMeetings(mt);
        },
      ),
    [],
  );

  useEffect(() => {
    Promise.all([carregarSites(), carregarSistemas()]).catch((e) =>
      setErro((e as Error).message),
    );
  }, [carregarSites, carregarSistemas]);

  const atualizaPedido = (p: PedidoAdmin) => {
    setPedidos((lista) =>
      [p, ...(lista || []).filter((x) => x.id !== p.id)].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    );
    listarEtapasPedidos()
      .then(setEtapas)
      .catch(() => undefined);
  };

  const recarregarSistemas = () =>
    carregarSistemas().catch((e) => toast.error((e as Error).message));

  const nossaVezSites = (pedidos || []).filter((p) =>
    ["recebido", "mudanca_pedida", "contrato_aceito", "pago"].includes(
      p.status,
    ),
  ).length;
  const sistemasAtivos = projetos.filter(
    (p) => p.status !== "concluido",
  ).length;
  const contador: Record<Aba, number | null> = {
    sites: nossaVezSites || null,
    sistemas: sistemasAtivos || null,
    financeiro: null,
    metricas: null,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main
        className="pt-28 pb-20 container mx-auto px-4 max-w-6xl"
        data-clarity-mask="True"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-primary font-semibold mb-1">
              Painel Codifica
            </p>
            <h1 className="text-3xl md:text-4xl font-bold font-manrope">
              Olá, {user?.nome.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              {nossaVezSites > 0
                ? `${nossaVezSites} ${nossaVezSites === 1 ? "pedido de site espera" : "pedidos de site esperam"} por vocês.`
                : "Nenhum pedido de site esperando por vocês agora."}
            </p>
          </div>
          <div
            className="inline-flex flex-wrap rounded-xl border border-border p-1 bg-card/50 self-start md:self-auto"
            role="tablist"
          >
            {ABAS.map(({ id, rotulo, icone: Icone }) => (
              <button
                key={id}
                role="tab"
                aria-selected={aba === id}
                onClick={() =>
                  setParams(id === "sites" ? {} : { aba: id }, {
                    replace: true,
                  })
                }
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                  aba === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icone className="w-4 h-4" aria-hidden />
                {rotulo}
                {contador[id] !== null && (
                  <span
                    className={`text-xs rounded-full px-1.5 ${aba === id ? "bg-primary-foreground/20" : "bg-primary/15 text-primary"}`}
                  >
                    {contador[id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-destructive mb-4">{erro}</p>}
        {!pedidos && !erro && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {pedidos && aba === "sites" && (
          <AbaSites
            pedidos={pedidos}
            etapas={etapas}
            onAtualiza={atualizaPedido}
          />
        )}

        {pedidos && aba === "sistemas" && (
          <AbaSistemas
            projetos={projetos}
            usuarios={usuarios}
            meetings={meetings}
            onRecarregar={recarregarSistemas}
          />
        )}

        {pedidos && aba === "financeiro" && (
          <AbaFinanceiro
            pedidos={pedidos}
            projetos={projetos}
            usuarios={usuarios}
          />
        )}

        {pedidos && aba === "metricas" && (
          <AbaMetricas
            funilCodifica={
              <div className="space-y-6">
                <AdminFunil pedidos={pedidos} etapas={etapas} />
                <section className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
                  <h2 className="text-xl font-semibold mb-1">
                    Sistemas por etapa
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Onde estão os projetos de sistema agora.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {PROJECT_STATUS_ORDER.map((s) => (
                      <div
                        key={s}
                        className="rounded-xl border border-border p-3 text-center"
                      >
                        <p className="text-2xl font-bold text-foreground">
                          {projetos.filter((p) => p.status === s).length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {PROJECT_STATUS_LABEL[s]}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            }
          />
        )}
      </main>
    </div>
  );
};

export default PainelCodifica;
