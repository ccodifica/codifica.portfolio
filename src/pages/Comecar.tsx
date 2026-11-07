import { useNavigate } from "react-router-dom";
import { PaginaOferta, Secao, Cartao } from "@/components/oferta/Base";
import FormularioPedido from "@/components/oferta/FormularioPedido";
import { criarPedido } from "@/lib/pedidos";
import { PRAZO_PREVIA } from "@/config/oferta";

const Comecar = () => {
  const navigate = useNavigate();

  return (
    <PaginaOferta evento="visita_comecar">
      <Secao className="pt-6 md:pt-10 max-w-3xl">
        <p className="text-primary font-semibold mb-4">Prévia grátis, sem compromisso</p>
        <h1 className="hero-text text-4xl sm:text-5xl leading-tight mb-4">Vamos montar a prévia do seu site</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Leva 2 minutos. Em até {PRAZO_PREVIA} você recebe a prévia. Só paga se aprovar.
        </p>
        <Cartao>
          <FormularioPedido
            textoBotao="Quero minha prévia"
            onEnviar={async (dados) => {
              const codigo = await criarPedido(dados);
              navigate(`/pedido/${codigo}`, { replace: true });
            }}
          />
        </Cartao>
      </Secao>
    </PaginaOferta>
  );
};

export default Comecar;
