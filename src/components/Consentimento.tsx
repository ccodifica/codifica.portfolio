import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CLARITY_ID, capturarUtm, carregarClarity, lerConsentimento, salvarConsentimento } from "@/lib/metricas";

/**
 * Aviso de métricas. Só aparece se o Clarity estiver configurado.
 * Recusar não muda nada no uso do site; a contagem anônima continua.
 */
const Consentimento = () => {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    capturarUtm();
    const c = lerConsentimento();
    if (c === "aceito") carregarClarity();
    setVisivel(Boolean(CLARITY_ID) && c === null);
  }, []);

  if (!visivel) return null;

  const escolher = (c: "aceito" | "recusado") => {
    salvarConsentimento(c);
    setVisivel(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de métricas"
      className="fixed bottom-4 inset-x-4 md:left-auto md:right-6 md:max-w-sm z-50 rounded-2xl border border-border bg-card p-5 shadow-2xl"
    >
      <p className="text-sm text-foreground/90 mb-4">
        Usamos o Microsoft Clarity para entender onde o site confunde as pessoas e melhorar. Ele registra cliques e
        rolagem, sem o que você digita nos campos.{" "}
        <Link to="/privacidade" className="underline">
          Saiba mais
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl" onClick={() => escolher("aceito")}>
          Aceitar
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => escolher("recusado")}>
          Recusar
        </Button>
      </div>
    </div>
  );
};

export default Consentimento;
