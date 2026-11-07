import { PaginaOferta, Secao } from "@/components/oferta/Base";
import TextoContrato from "@/components/oferta/TextoContrato";

const Contrato = () => (
  <PaginaOferta evento="visita_contrato">
    <Secao className="pt-6 md:pt-10 max-w-3xl">
      <p className="text-primary font-semibold mb-4">Site + Perfil do Google</p>
      <h1 className="hero-text text-4xl sm:text-5xl leading-tight mb-6">Contrato de prestação de serviços</h1>
      <p className="text-muted-foreground mb-10">
        Este é o contrato que você aceita depois de aprovar a prévia, antes do pagamento. Deixamos ele aberto aqui para
        você ler com calma antes de começar.
      </p>
      <TextoContrato />
    </Secao>
  </PaginaOferta>
);

export default Contrato;
