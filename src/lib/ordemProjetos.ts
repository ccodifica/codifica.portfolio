import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { registrar } from "@/lib/metricas";
import type { Projeto } from "@/config/projetos";

/**
 * Ordem do portfólio: mais clicados primeiro. Empates (e o começo, sem cliques)
 * ficam em ordem aleatória, sorteada uma vez por visita para que a home, a
 * página Projetos e a oferta mostrem a mesma ordem.
 */

const sorteio = new Map<string, number>();
const pesoAleatorio = (id: string) => {
  if (!sorteio.has(id)) sorteio.set(id, Math.random());
  return sorteio.get(id)!;
};

let cliquesCache: Promise<Record<string, number>> | null = null;
const buscarCliques = () => {
  if (!cliquesCache) {
    cliquesCache = Promise.resolve(supabase.rpc("projetos_cliques")).then(({ data, error }) =>
      error || !data ? {} : (data as Record<string, number>)
    );
  }
  return cliquesCache;
};

const ordenar = (lista: Projeto[], cliques: Record<string, number>) =>
  [...lista].sort((a, b) => (cliques[b.id] || 0) - (cliques[a.id] || 0) || pesoAleatorio(a.id) - pesoAleatorio(b.id));

export function useProjetosOrdenados(lista: Projeto[]) {
  const [ordem, setOrdem] = useState(() => ordenar(lista, {}));
  useEffect(() => {
    let ativo = true;
    buscarCliques().then((c) => ativo && setOrdem(ordenar(lista, c)));
    return () => {
      ativo = false;
    };
  }, [lista]);
  return ordem;
}

/** Conta um clique no projeto (uma pessoa conta uma vez por visita). */
export const registrarCliqueProjeto = (id: string) => registrar("clique_projeto", id, true);
