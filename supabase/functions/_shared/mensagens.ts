// Textos dos e-mails automáticos. Cada função devolve { assunto, html }.
import { brl, dataBR, linkPedido, molde, primeiroNome } from "./email.ts";

type P = { nome: string; negocio: string; codigo: string };
const FORMA_TXT: Record<string, string> = { pix: "Pix", boleto: "Boleto", cartao: "Cartão de crédito", outro: "Outro" };
const mesAno = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00-03:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const NOME_ORIGEM: Record<string, string> = {
  google: "Google",
  google_ads: "Anúncio no Google",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  whatsapp: "WhatsApp",
  direto: "Acesso direto",
  bing: "Bing",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};
const nomeOrigem = (o: string) => NOME_ORIGEM[o] || o;
const variacao = (agora: number, antes: number) => {
  if (!antes) return agora ? "novo" : "";
  const p = Math.round(((agora - antes) / antes) * 100);
  return p === 0 ? "igual ao mês anterior" : `${p > 0 ? "+" : ""}${p}% que o mês anterior`;
};

// deno-lint-ignore no-explicit-any
type DadosRelatorio = Record<string, any>;

export const MSG = {
  relatorio: (s: { nome: string; url: string; cliente: string | null }, d: DadosRelatorio) => {
    const nomeMes = new Date(`${d.mes}-15T12:00:00-03:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const a = d.atual;
    const contatos = a.whatsapp + a.telefone + a.rota + a.formularios;
    const origens = Object.entries(a.origens as Record<string, number>)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 4)
      .map(([o, n]) => `${nomeOrigem(o)}: ${n}`)
      .join(" · ");
    const tabela: [string, string][] = [
      ["Visitas no site", `${a.visitas}${d.anterior.visitas || a.visitas ? ` (${variacao(a.visitas, d.anterior.visitas) || "primeiro mês"})` : ""}`],
      ["Cliques no WhatsApp", String(a.whatsapp)],
    ];
    if (a.telefone) tabela.push(["Cliques para ligar", String(a.telefone)]);
    if (a.rota) tabela.push(["Pedidos de rota", String(a.rota)]);
    if (d.perfil_empresa) {
      tabela.push(["Vezes que o seu Perfil apareceu no Google", String(d.perfil_empresa.visualizacoes)]);
      if (d.perfil_empresa.ligacoes) tabela.push(["Ligações pelo Perfil do Google", String(d.perfil_empresa.ligacoes)]);
      if (d.perfil_empresa.rotas) tabela.push(["Rotas pelo Perfil do Google", String(d.perfil_empresa.rotas)]);
    }
    if (d.search_console) tabela.push(["Aparições nas buscas do Google", String(d.search_console.impressoes)]);
    if (d.disponibilidade != null) tabela.push(["Site no ar", `${String(d.disponibilidade).replace(".", ",")}% do tempo`]);
    if (d.pagespeed?.desempenho != null) tabela.push(["Nota de velocidade no celular (Google)", `${d.pagespeed.desempenho}/100`]);
    const buscas = (d.search_console?.buscas || []).slice(0, 3).map((b: { termo: string }) => `“${b.termo}”`).join(", ");
    return {
      assunto: `Seu site em ${nomeMes}: ${a.visitas} visitas e ${contatos} contatos`,
      html: molde({
        titulo: `Como foi o seu site em ${nomeMes}`,
        paragrafos: [
          `Olá! Este é o resumo do mês do site ${s.nome}, que a Codifica cuida para você.`,
          contatos
            ? `No mês, o site gerou <strong>${contatos} contato${contatos > 1 ? "s" : ""}</strong> direto com você (WhatsApp, ligação, rota ou formulário).`
            : "Neste mês o site ainda não gerou contatos diretos. Se quiser, a gente revisa juntos o que dá para melhorar.",
          ...(origens ? [`De onde vieram as visitas: ${origens}.`] : []),
          ...(buscas ? [`Algumas buscas que trouxeram gente até você: ${buscas}.`] : []),
        ],
        tabela,
        botao: { texto: "Abrir o meu site", url: s.url },
        rodape: "Quer mudar algo no site ou no Perfil do Google? É só responder este e-mail.",
      }),
    };
  },

  recibo: (p: P, l: { valor: number; forma: string; parcelas: number; data: string }, prazo: string) => ({
    assunto: `Pagamento confirmado: o site do ${p.negocio} começou`,
    html: molde({
      titulo: `Pagamento confirmado, ${primeiroNome(p.nome)}!`,
      paragrafos: [
        `A equipe já foi avisada e começou o seu site completo. Ele fica pronto até <strong>${prazo}</strong>.`,
        "Este é o seu comprovante. A nota fiscal chega em outro e-mail assim que a prefeitura autorizar.",
      ],
      tabela: [
        ["Negócio", p.negocio],
        ["Referente a", "Site + Perfil do Google"],
        ["Forma de pagamento", FORMA_TXT[l.forma] + (l.parcelas > 1 ? ` em ${l.parcelas}x` : "")],
        ["Data", dataBR(l.data)],
        ["Valor", brl(l.valor)],
      ],
      botao: { texto: "Acompanhar meu pedido", url: linkPedido(p.codigo) },
      rodape: "O recibo também fica no seu link pessoal, para imprimir ou salvar em PDF.",
    }),
  }),

  reciboMensalidade: (p: P, l: { valor: number; forma: string; competencia: string }) => ({
    assunto: `Mensalidade de ${mesAno(l.competencia)} recebida`,
    html: molde({
      titulo: "Mensalidade recebida, obrigado!",
      paragrafos: ["Recebemos a mensalidade da manutenção do seu site. A nota fiscal chega em outro e-mail."],
      tabela: [
        ["Negócio", p.negocio],
        ["Referente a", `Manutenção de ${mesAno(l.competencia)}`],
        ["Forma de pagamento", FORMA_TXT[l.forma]],
        ["Valor", brl(l.valor)],
      ],
      botao: { texto: "Ver meus pagamentos", url: linkPedido(p.codigo) },
    }),
  }),

  nota: (p: P, numero: string | null) => ({
    assunto: `Sua nota fiscal${numero ? ` nº ${numero}` : ""} chegou`,
    html: molde({
      titulo: "Sua nota fiscal chegou",
      paragrafos: [`Olá, ${primeiroNome(p.nome)}! A nota fiscal do seu pagamento está em anexo, em PDF.`, "Ela também fica guardada no seu link pessoal."],
      botao: { texto: "Abrir meu pedido", url: linkPedido(p.codigo) },
    }),
  }),

  cobrancaMensal: (p: P, c: { valor: number; vencimento: string; url: string }) => ({
    assunto: `Mensalidade do seu site: vence em ${dataBR(c.vencimento)}`,
    html: molde({
      titulo: "Sua mensalidade está disponível",
      paragrafos: [
        `Olá, ${primeiroNome(p.nome)}! A mensalidade da manutenção do site do ${p.negocio} já pode ser paga, por Pix, boleto ou cartão.`,
        "Ela cobre hospedagem, domínio, o seu Perfil do Google em dia e os ajustes que você pedir pelo WhatsApp.",
      ],
      tabela: [
        ["Valor", brl(c.valor)],
        ["Vencimento", dataBR(c.vencimento)],
      ],
      botao: { texto: "Pagar a mensalidade", url: c.url },
      rodape: "Pode cancelar quando quiser, sem multa, pelo seu link pessoal.",
    }),
  }),

  atraso: (p: P, c: { valor: number; vencimento: string; url: string }) => ({
    assunto: "Sua mensalidade ficou em aberto",
    html: molde({
      titulo: "A mensalidade ficou em aberto",
      paragrafos: [
        `Olá, ${primeiroNome(p.nome)}! A mensalidade que venceu em ${dataBR(c.vencimento)} ainda não apareceu por aqui. Se já pagou, pode desconsiderar este e-mail.`,
        "Se preferir encerrar a manutenção, é só fazer isso pelo seu link pessoal, sem multa: a gente transfere tudo para você.",
      ],
      tabela: [["Valor", brl(c.valor)]],
      botao: { texto: "Pagar agora", url: c.url },
    }),
  }),

  cartaoRecusado: (p: P) => ({
    assunto: "O pagamento no cartão não passou",
    html: molde({
      titulo: "O cartão não foi aprovado",
      paragrafos: [
        `Olá, ${primeiroNome(p.nome)}! A operadora do cartão recusou o pagamento do site do ${p.negocio}. Isso acontece por limite, bloqueio de segurança do banco ou dado digitado errado.`,
        "Você pode tentar de novo com outro cartão ou pagar por <strong>Pix</strong>, que é aprovado na hora.",
      ],
      botao: { texto: "Tentar de novo", url: linkPedido(p.codigo) },
    }),
  }),

  lembretePrevia: (p: P) => ({
    assunto: `A prévia do site do ${p.negocio} está esperando você`,
    html: molde({
      titulo: "Já viu a sua prévia?",
      paragrafos: [
        `Olá, ${primeiroNome(p.nome)}! A prévia do site do ${p.negocio} está pronta. É só abrir, ver com calma e aprovar com um toque.`,
        "Quer mudar alguma coisa antes? Dá para pedir pelo próprio link ou no WhatsApp.",
      ],
      botao: { texto: "Ver a minha prévia", url: linkPedido(p.codigo) },
    }),
  }),

  lembreteContrato: (p: P) => ({
    assunto: "Falta só o contrato para o seu site",
    html: molde({
      titulo: "Falta só o contrato",
      paragrafos: [
        `Olá, ${primeiroNome(p.nome)}! Você aprovou a prévia do ${p.negocio}. O próximo passo é o contrato: curto, com um resumo do que está incluído, e você aceita no próprio link.`,
      ],
      botao: { texto: "Ver o contrato", url: linkPedido(p.codigo) },
    }),
  }),

  lembretePagamento: (p: P, o: { segundo: boolean; pixGerado: boolean; precoPix: number; promoAte: string | null }) => ({
    assunto: o.segundo ? `Ainda quer o site do ${p.negocio}?` : "Seu site está a um passo",
    html: molde({
      titulo: o.segundo ? "Ainda dá tempo" : "Seu site está a um passo",
      paragrafos: [
        o.pixGerado
          ? `Olá, ${primeiroNome(p.nome)}! Vimos que você chegou a gerar o Pix de ${brl(o.precoPix)}. Assim que ele cair, a gente começa o seu site na hora.`
          : `Olá, ${primeiroNome(p.nome)}! O contrato do ${p.negocio} já está aceito. Falta só o pagamento para começarmos o site completo.`,
        "Pix é aprovado na hora. No cartão, dá para parcelar.",
        ...(o.promoAte ? [`O preço de Black Friday vale para quem aceitou o contrato até ${o.promoAte}.`] : []),
        ...(o.segundo ? ["Ficou alguma dúvida? Responda este e-mail que a gente explica."] : []),
      ],
      botao: { texto: "Ir para o pagamento", url: linkPedido(p.codigo) },
    }),
  }),
};
