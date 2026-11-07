import { CLAUSULAS, CONTRATO_DATA, CONTRATO_RASCUNHO, CONTRATO_VERSAO } from "@/config/contrato";

/** Texto completo do contrato, usado em /contrato e no passo de aceite do pedido. */
const TextoContrato = ({ compacto = false }: { compacto?: boolean }) => (
  <div className={compacto ? "space-y-5 text-sm" : "space-y-8"}>
    {CONTRATO_RASCUNHO && (
      <p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
        Rascunho em revisão jurídica. O texto pode mudar antes da versão final.
      </p>
    )}
    {CLAUSULAS.map((c) => (
      <section key={c.titulo}>
        <h2 className={compacto ? "text-base font-semibold mb-2" : "text-xl md:text-2xl font-semibold mb-3"}>
          {c.titulo}
        </h2>
        <ul className="space-y-2 text-foreground/85 list-disc pl-5">
          {c.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    ))}
    <p className="text-muted-foreground text-sm">
      Versão {CONTRATO_VERSAO}, de {CONTRATO_DATA}.
    </p>
  </div>
);

export default TextoContrato;
