import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginaOferta, Secao, Cartao } from "@/components/oferta/Base";
import { useAuth } from "@/contexts/AuthContext";
import { PEDIDO_STATUS_LABEL, PedidoPublico, meusPedidos } from "@/lib/pedidos";
import { listProjectsByCliente } from "@/lib/client-area-store";
import { ROTAS } from "@/config/rotas";

/**
 * Depois do login: lista os pedidos do e-mail. Com um só pedido, abre direto.
 * Cliente de sistema (projeto no Espaço do Cliente antigo) vai para o painel completo.
 */
const MinhaArea = () => {
  const { user, logout } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoPublico[] | null>(null);
  const [temProjeto, setTemProjeto] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([
      meusPedidos(),
      user ? listProjectsByCliente(user.id).catch(() => []) : Promise.resolve([]),
    ])
      .then(([p, projetos]) => {
        setPedidos(p);
        setTemProjeto(projetos.length > 0);
      })
      .catch((e) => setErro((e as Error).message));
  }, [user]);

  if (pedidos && pedidos.length === 1 && !temProjeto) return <Navigate to={`/pedido/${pedidos[0].codigo}`} replace />;
  if (pedidos && pedidos.length === 0 && temProjeto) return <Navigate to={ROTAS.painelSistema} replace />;

  return (
    <PaginaOferta>
      <Secao className="max-w-3xl pt-6">
        {user?.role === "admin" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <span>Você está vendo a área como cliente.</span>
            <Link to={ROTAS.admin} className="font-semibold text-primary hover:underline">
              Ir para o painel →
            </Link>
          </div>
        )}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Olá{user ? `, ${user.nome.split(" ")[0]}` : ""}!</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>

        {erro && <p className="text-destructive">{erro}</p>}
        {!pedidos && !erro && <Loader2 className="w-6 h-6 animate-spin text-primary" />}

        {pedidos && pedidos.length === 0 && !temProjeto && (
          <Cartao>
            <h2 className="text-xl font-semibold mb-2">Nenhum pedido neste e-mail</h2>
            <p className="text-muted-foreground mb-6">
              Se você fez o pedido com outro e-mail, saia e entre com ele. Se ainda não pediu, a prévia é grátis.
            </p>
            <Button asChild className="rounded-xl">
              <Link to="/comecar">Quero minha prévia grátis</Link>
            </Button>
          </Cartao>
        )}

        {pedidos && pedidos.length > 0 && (
          <ul className="space-y-3">
            {pedidos.map((p) => (
              <li key={p.codigo}>
                <Link
                  to={`/pedido/${p.codigo}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 p-5 hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{p.negocio}</p>
                    <p className="text-sm text-muted-foreground">{PEDIDO_STATUS_LABEL[p.status]}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary" />
                </Link>
              </li>
            ))}
            {temProjeto && (
              <li>
                <Link
                  to={ROTAS.painelSistema}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 p-5 hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">Projetos de sistema</p>
                    <p className="text-sm text-muted-foreground">Reuniões, documentos e andamento</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary" />
                </Link>
              </li>
            )}
          </ul>
        )}
      </Secao>
    </PaginaOferta>
  );
};

export default MinhaArea;
