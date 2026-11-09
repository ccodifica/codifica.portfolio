/**
 * Fonte única da oferta "Presença no Google": preços, prazos, o que inclui,
 * etapas do processo e perguntas frequentes. As páginas /presenca-no-google,
 * /como-funciona, /contrato e /pedido/:codigo leem tudo daqui.
 *
 * Valores marcados com CONFIRMAR ainda não foram fechados com o Pedro/Gustavo.
 */

export const WHATSAPP_CODIFICA = "5521968947527"; // chip da Codifica

export const linkWhatsapp = (mensagem: string) =>
  `https://wa.me/${WHATSAPP_CODIFICA}?text=${encodeURIComponent(mensagem)}`;

export const OFERTA = {
  nome: "Presença no Google",
  precoPix: 597,
  precoCartao: 650,
  mensalidade: 49, // manutenção opcional
  mesesManutencaoInclusos: 1, // o 1º mês já vem no preço do site
  prazoPreviaHoras: 6, // horas úteis: seg a sex, 9h às 18h
  prazoEntregaDias: 7, // corridos: "1 semana"
  mudancasNaPrevia: 1,
  rodadasDeAjuste: 1,
  // Máximo de parcelas no cartão. O Asaas não cobra juros do cliente: a taxa e o
  // prazo de recebimento (uma parcela por mês) ficam com a Codifica. Manter igual a
  // OFERTA.parcelasCartao em supabase/functions/_shared/asaas.ts.
  parcelasSemJuros: 3,
  formasPagamento: ["Pix", "boleto", "cartão de crédito"],
};

/** Horário de atendimento usado no prazo da prévia. Fora dele, respondemos se der, sem obrigação. */
export const HORARIO = { inicio: 9, fim: 18, texto: "seg a sex, das 9h às 18h" };

/**
 * Black Friday: preço temporário. Fora do período, valem os preços normais.
 * Não usar "de/por" riscado: o preço normal ainda não foi praticado.
 */
export const BLACK_FRIDAY = {
  precoPix: 499,
  precoCartao: 567,
  ate: "2026-11-30T23:59:59-03:00", // CONFIRMAR a data de término
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: v % 1 ? 2 : 0 });

export const dataCurta = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");

export const dataHora = (d: Date) =>
  `${dataCurta(d)}, às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

const diaMes = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Preço que vale hoje (Black Friday ou normal). */
export const precoAtual = (agora = new Date()) => {
  const promo = agora <= new Date(BLACK_FRIDAY.ate);
  return {
    promo,
    pix: promo ? BLACK_FRIDAY.precoPix : OFERTA.precoPix,
    cartao: promo ? BLACK_FRIDAY.precoCartao : OFERTA.precoCartao,
    ate: diaMes(BLACK_FRIDAY.ate),
  };
};

const P = precoAtual();

/**
 * Parcelamento no cartão (Asaas). Até 3x sem juros; de 4x a 12x o total sobe o
 * suficiente para a Codifica receber o mesmo que numa venda em 3x, já descontadas
 * a taxa do cartão e a antecipação (receber tudo em ~2 dias).
 * MANTER IGUAL em supabase/functions/_shared/asaas.ts (tabelaCartao).
 * Taxas: conta Asaas, promocionais até 06/02/2027 (depois +1 ponto). Antecipação: confirmar na conta real.
 */
export const CARTAO = {
  parcelasMax: 12,
  taxaFixa: 0.49,
  taxa: (n: number) => (n === 1 ? 0.0199 : n <= 6 ? 0.0249 : 0.0299),
  antecipacaoMes: 0.016,
};

export interface OpcaoParcela {
  parcelas: number;
  valorParcela: number;
  total: number;
  semJuros: boolean;
}

/** Opções de 1x a 12x para um preço de cartão (ex.: R$ 567). */
export const tabelaCartao = (precoCartao: number): OpcaoParcela[] => {
  const n3 = OFERTA.parcelasSemJuros;
  // o que sobra numa venda em 3x, antecipada: é a meta para as demais opções
  const liquido3 = precoCartao * (1 - CARTAO.taxa(n3) - (CARTAO.antecipacaoMes * (n3 + 1)) / 2) - CARTAO.taxaFixa;
  return Array.from({ length: CARTAO.parcelasMax }, (_, i) => {
    const n = i + 1;
    if (n <= n3) return { parcelas: n, valorParcela: Math.round((precoCartao / n) * 100) / 100, total: precoCartao, semJuros: true };
    const bruto = (liquido3 + CARTAO.taxaFixa) / (1 - CARTAO.taxa(n) - (CARTAO.antecipacaoMes * (n + 1)) / 2);
    const valorParcela = Math.ceil((bruto / n) * 100) / 100;
    return { parcelas: n, valorParcela, total: Math.round(valorParcela * n * 100) / 100, semJuros: false };
  });
};

/** "em até 3x sem juros ou até 12x" */
export const PARCELAS_TEXTO = `em até ${OFERTA.parcelasSemJuros}x sem juros ou até ${CARTAO.parcelasMax}x`;

/** "R$ 499 no Pix ou boleto, ou R$ 567 no cartão" */
export const PRECO_TEXTO = `${brl(P.pix)} no Pix ou boleto, ou ${brl(P.cartao)} no cartão`;

/**
 * Prazo da prévia em horas úteis (seg a sex, 9h às 18h, sem contar feriados).
 * Ex.: pedido na sexta às 20h vence na segunda às 15h.
 */
export const prazoPrevia = (inicio: Date, horas = OFERTA.prazoPreviaHoras) => {
  const d = new Date(inicio);
  let restanteMin = horas * 60;
  const util = (x: Date) => x.getDay() !== 0 && x.getDay() !== 6;
  // posiciona no próximo instante útil (dia útil, entre 9h e 18h)
  const ajustar = () => {
    for (let i = 0; i < 14; i++) {
      if (!util(d) || d.getHours() >= HORARIO.fim) {
        d.setDate(d.getDate() + 1);
        d.setHours(HORARIO.inicio, 0, 0, 0);
        continue;
      }
      if (d.getHours() < HORARIO.inicio) d.setHours(HORARIO.inicio, 0, 0, 0);
      return;
    }
  };
  ajustar();
  while (restanteMin > 0) {
    const fimDoDia = new Date(d);
    fimDoDia.setHours(HORARIO.fim, 0, 0, 0);
    const disponivel = Math.round((fimDoDia.getTime() - d.getTime()) / 60000);
    if (restanteMin <= disponivel) {
      d.setMinutes(d.getMinutes() + restanteMin);
      restanteMin = 0;
    } else {
      restanteMin -= disponivel;
      d.setDate(d.getDate() + 1);
      d.setHours(HORARIO.inicio, 0, 0, 0);
      ajustar();
    }
  }
  return d;
};
/** "Preço de Black Friday até 30/11. Depois, R$ 597 no Pix ou R$ 650 no cartão." */
export const PRECO_DEPOIS = P.promo
  ? `Preço de Black Friday até ${P.ate}. Depois, ${brl(OFERTA.precoPix)} no Pix ou ${brl(OFERTA.precoCartao)} no cartão.`
  : "";

export const INCLUI_IMPLANTACAO = [
  "Site de uma página, feito para celular, com botão de WhatsApp",
  "Textos e fotos organizados a partir do que você já publica",
  "Perfil da Empresa no Google completo: fotos, horário, serviços e link do site",
  "SEO básico: título, descrição e cadastro no Google Search Console",
  "Domínio .com.br no 1º ano",
  "1º mês de hospedagem e manutenção já incluso",
];

// Ordem importa: o item mais forte primeiro, o que dá segurança por último.
export const INCLUI_MENSALIDADE = [
  "4 publicações por mês e resposta às avaliações no seu Perfil do Google",
  "1 pequeno ajuste por mês no site (trocar foto, preço, horário, texto)",
  "Relatório mensal com visitas e contatos",
  "Hospedagem e renovação do domínio por nossa conta",
  "Cancele quando quiser, sem aviso e sem multa",
];

/** O que acontece se o cliente não quiser a manutenção. */
export const SEM_MANUTENCAO =
  "A manutenção é opcional. Sem ela, transferimos o domínio, o Perfil do Google e os arquivos do site para você, sem custo, e você passa a pagar a hospedagem e a renovação do domínio direto a um provedor. Explicamos o passo a passo.";

export const PRAZO_PREVIA = `${OFERTA.prazoPreviaHoras} horas úteis`;
export const PRAZO_SITE = OFERTA.prazoEntregaDias === 7 ? "1 semana" : `${OFERTA.prazoEntregaDias} dias`;
export const RODADAS = `${OFERTA.rodadasDeAjuste} ${OFERTA.rodadasDeAjuste === 1 ? "rodada" : "rodadas"} de ajustes`;

/** Linha de redução de risco que vai embaixo dos botões principais. */
export const LINHA_RISCO = `Grátis e sem compromisso. Prévia em até ${PRAZO_PREVIA} no seu WhatsApp. Se aprovar: ${brl(P.pix)} no Pix${
  P.promo ? " (preço de Black Friday)" : ""
}, com o 1º mês de manutenção incluso.`;

export const NAO_INCLUI = [
  "Criação de logo ou identidade visual",
  "Sessão de fotos profissional",
  "Mais páginas, blog ou loja virtual",
  "Agenda online, pagamento pelo site ou área do cliente (isso é sistema, orçado à parte)",
  "Gestão de Instagram, Facebook ou anúncios pagos",
  "Garantia de primeira posição no Google",
];

export interface EtapaProcesso {
  titulo: string;
  texto: string;
  quem: "voce" | "codifica" | "juntos";
}

export const ETAPAS_PROCESSO: EtapaProcesso[] = [
  {
    titulo: "Você manda o básico",
    texto:
      "Preenche um formulário de 2 minutos com o nome do negócio e onde ele aparece na internet: Instagram, Facebook ou Google. Se preferir, a conversa começa pelo WhatsApp.",
    quem: "voce",
  },
  {
    titulo: "A gente busca o seu material",
    texto:
      "Logo, fotos, serviços, horário e endereço saem do que você já publicou. Se faltar alguma coisa, pedimos só aquilo pelo WhatsApp. Mandar arquivos é opcional.",
    quem: "codifica",
  },
  {
    titulo: `Prévia em até ${PRAZO_PREVIA}`,
    texto: `Contamos as horas no horário comercial (${HORARIO.texto}). Você vê como o site vai ficar antes de pagar qualquer coisa. Pode pedir uma mudança na prévia. Se não gostar, não paga nada.`,
    quem: "codifica",
  },
  {
    titulo: "Contrato e pagamento",
    texto: `Gostou da prévia? Você aceita o contrato aqui mesmo no site e paga ${PRECO_TEXTO} (${PARCELAS_TEXTO}).`,
    quem: "voce",
  },
  {
    titulo: `Site completo em até ${PRAZO_SITE}`,
    texto: `Montamos o site inteiro e deixamos o seu Perfil do Google completo. Antes de publicar, você tem ${RODADAS}.`,
    quem: "juntos",
  },
  {
    titulo: "Site no ar",
    texto: "Site publicado no seu domínio, com o botão de WhatsApp funcionando. O 1º mês de manutenção já está incluso.",
    quem: "codifica",
  },
  {
    titulo: "Perfil do Google: a parte do Google",
    texto:
      "Se o seu negócio já tem Perfil verificado, as mudanças aparecem em poucos dias. Se ainda não tem, a gente cria o Perfil completo e envia para o Google verificar. Quem verifica é o Google, e o prazo é dele: costuma levar de alguns dias a 2 semanas. Às vezes ele pede um vídeo do local ou um código, e a gente te explica o que fazer.",
    quem: "juntos",
  },
  {
    titulo: "Manutenção opcional",
    texto: `A partir do 2º mês, se quiser, cuidamos de tudo por ${brl(OFERTA.mensalidade)}/mês: hospedagem, domínio, publicações no Google, respostas às avaliações, um ajuste por mês e relatório. Se preferir não seguir, transferimos tudo para você.`,
    quem: "codifica",
  },
];

export const PERGUNTAS = [
  {
    p: "Preciso mandar fotos e logo?",
    r: "Não. A gente usa o que você já publicou no Instagram, Facebook ou Google. Se quiser mandar arquivos com mais qualidade, pode, mas é opcional.",
  },
  {
    p: "E se eu não gostar da prévia?",
    r: "Você pode pedir uma mudança. Se mesmo assim não gostar, é só não seguir. A prévia não tem custo nem compromisso.",
  },
  {
    p: "Quando eu pago?",
    r: `Só depois de aprovar a prévia e aceitar o contrato. O site sai por ${PRECO_TEXTO}, ${PARCELAS_TEXTO}.${P.promo ? ` ${PRECO_DEPOIS}` : ""}`,
  },
  {
    p: "A manutenção é obrigatória?",
    r: `Não. O 1º mês já vem incluso no preço do site. Depois, ela custa ${brl(OFERTA.mensalidade)}/mês e você decide se quer continuar. Dá para cancelar quando quiser, sem aviso e sem multa. Sem a manutenção, transferimos o domínio, o Perfil do Google e os arquivos para você, sem custo, e a hospedagem e a renovação do domínio passam a ser pagas por você direto a um provedor.`,
  },
  {
    p: "O domínio e o Perfil do Google ficam com quem?",
    r: "A Codifica cuida de tudo enquanto você tiver a manutenção. Se pedir, transferimos em até 7 dias úteis, sem custo de transferência.",
  },
  {
    p: "Em quanto tempo meu Perfil aparece no Google?",
    r: "Se você já tem Perfil verificado, as mudanças aparecem em poucos dias. Se ainda não tem, a gente cria e envia para o Google verificar dentro da semana do site, mas a verificação é feita pelo Google e o prazo é dele. Costuma levar de alguns dias a 2 semanas. Se o Google pedir um vídeo do local ou um código, a gente te explica o passo a passo.",
  },
  {
    p: "Vocês garantem primeiro lugar no Google?",
    r: "Não. Ninguém pode garantir isso. O que fazemos é deixar o site e o perfil completos e bem configurados, e mostrar os números todo mês.",
  },
  {
    p: "Posso desistir depois de pagar?",
    r: "Sim. Em até 7 dias depois do pagamento, devolvemos o valor integral.",
  },
  {
    p: "Preciso de agenda, pagamento online ou área do cliente. Vocês fazem?",
    r: "Fazemos, mas isso é um sistema, não um site simples. Nesse caso marcamos uma conversa para entender o que você precisa antes de passar um valor.",
  },
];

/** Vídeo "Como funciona" (hospedado no próprio site, em public/video). Vazio = não mostra o bloco. */
export const VIDEO_COMO_FUNCIONA = { src: "/video/como-funciona.mp4", capa: "/video/como-funciona-capa.webp", duracao: "1:18" };

/** Quem faz o site. Foto fica para depois; por enquanto, link do LinkedIn (vazio = sem botão). */
export const EQUIPE = [
  { nome: "Gustavo", formacao: "Análise e Desenvolvimento de Sistemas", linkedin: "https://www.linkedin.com/in/gustavosouzaz/", foto: "gustavo" },
  { nome: "Pedro Henrique", formacao: "Ciência da Computação", linkedin: "https://www.linkedin.com/in/pedrohferreirarj/", foto: "pedro" },
] as const;

/**
 * Quem assina o contrato e emite a nota: o MEI do Pedro (o mesmo da conta Asaas),
 * confirmado pelo Pedro em 07/11/2026.
 */
export const CONTRATADA = {
  razaoSocial: "67.544.631 Pedro Henrique Ferreira da Silva",
  cnpj: "67.544.631/0001-42",
};

/** Endereço público da Codifica (seção de contato e mapa). */
export const ENDERECO = {
  linha1: "Av. Borges de Medeiros, 699, bloco 9",
  linha2: "Leblon, Rio de Janeiro - RJ, 22430-041",
  // ponto exato informado pelo Pedro: 22°58'53.4"S 43°12'59.6"W
  mapa: "https://www.google.com/maps?q=-22.981500,-43.216556&z=17&output=embed",
  link: "https://www.google.com/maps/search/?api=1&query=-22.981500,-43.216556",
};
