import { BLACK_FRIDAY, CARTAO, CONTRATADA, OFERTA, RODADAS, brl } from "./oferta";

/**
 * Contrato da oferta "Presença no Google".
 * RASCUNHO: precisa de revisão de advogado antes do primeiro cliente pagante.
 * Toda alteração de texto deve subir a versão: o aceite grava a versão aceita.
 */
export const CONTRATO_VERSAO = "1.3-rascunho";
export const CONTRATO_RASCUNHO = true;
export const CONTRATO_DATA = "07/11/2026";

export interface Clausula {
  titulo: string;
  itens: string[];
}

export const CLAUSULAS: Clausula[] = [
  {
    titulo: "1. Partes e objeto",
    itens: [
      `CONTRATADA: ${
        CONTRATADA.razaoSocial && CONTRATADA.cnpj
          ? `${CONTRATADA.razaoSocial}, inscrita no CNPJ ${CONTRATADA.cnpj}, que atua sob o nome Codifica`
          : "Codifica (razão social e CNPJ a definir)"
      }, responsável pela criação e manutenção do site. CONTRATANTE: a pessoa ou empresa identificada no aceite eletrônico deste contrato.`,
      "O objeto é a criação de um site de uma página para o negócio do CONTRATANTE, a configuração do Perfil da Empresa no Google e, se mantida a mensalidade, a manutenção mensal descrita na cláusula 5.",
    ],
  },
  {
    titulo: "2. O que está incluído na implantação",
    itens: [
      "Site de uma página, adaptado para celular, com botão de WhatsApp.",
      "Registro do domínio .com.br no primeiro ano.",
      `Hospedagem e manutenção no 1º mês após a publicação, já incluídas no preço da implantação.`,
      "SEO básico: título, descrição e cadastro no Google Search Console.",
      "Perfil da Empresa no Google completo, com fotos, horário, serviços e link do site.",
      `${RODADAS.charAt(0).toUpperCase() + RODADAS.slice(1)} no site completo antes da publicação.`,
    ],
  },
  {
    titulo: "3. O que não está incluído",
    itens: [
      "Criação de logo ou identidade visual, sessão de fotos, páginas adicionais, blog, loja virtual, agenda online, pagamento pelo site, área do cliente, gestão de redes sociais e anúncios pagos.",
      "Esses serviços podem ser contratados à parte, mediante novo orçamento.",
      "A CONTRATADA não garante posição específica nos resultados do Google.",
    ],
  },
  {
    titulo: "4. Preço, pagamento e prazos",
    itens: [
      `Implantação: ${brl(OFERTA.precoPix)} no Pix ou boleto, ou ${brl(OFERTA.precoCartao)} no cartão de crédito em até ${OFERTA.parcelasSemJuros}x sem juros, ou de ${OFERTA.parcelasSemJuros + 1}x a ${CARTAO.parcelasMax}x com acréscimo, sendo o valor de cada parcela e o total informados na página de pagamento antes da confirmação, pagos após a aprovação da prévia e o aceite deste contrato.`,
      `Durante a promoção de Black Friday, até ${new Date(BLACK_FRIDAY.ate).toLocaleDateString("pt-BR")}, a implantação sai por ${brl(BLACK_FRIDAY.precoPix)} no Pix ou boleto, ou ${brl(BLACK_FRIDAY.precoCartao)} no cartão, nas mesmas condições de parcelamento. Vale o preço do dia do aceite.`,
      `O site completo é entregue em até ${OFERTA.prazoEntregaDias} dias corridos após a confirmação do pagamento. Pagamentos por boleto são considerados confirmados na compensação.`,
      "O prazo fica suspenso enquanto a CONTRATADA aguarda informação ou aprovação do CONTRATANTE.",
    ],
  },
  {
    titulo: "5. Manutenção mensal (opcional)",
    itens: [
      `A manutenção é opcional. O 1º mês após a publicação já está incluído no preço da implantação. A partir do 2º mês, se o CONTRATANTE quiser continuar, ela custa ${brl(OFERTA.mensalidade)} por mês.`,
      "Inclui hospedagem, renovação do domínio, 1 pequeno ajuste por mês no site, 4 publicações por mês no Perfil do Google, resposta às avaliações do Google e relatório mensal.",
      "Ajustes não utilizados no mês não acumulam.",
      "O CONTRATANTE pode cancelar a manutenção a qualquer momento, sem aviso prévio e sem multa. O mês já pago vale até o fim e não há nova cobrança.",
      "Sem a manutenção, a CONTRATADA transfere o domínio, o Perfil da Empresa no Google e os arquivos do site ao CONTRATANTE, conforme a cláusula 7, e a hospedagem e a renovação do domínio passam a ser contratadas e pagas pelo CONTRATANTE diretamente a um provedor de sua escolha.",
    ],
  },
  {
    titulo: "6. Material do cliente e autorização de uso",
    itens: [
      "O CONTRATANTE autoriza a CONTRATADA a usar no site e no Perfil do Google os textos, imagens e logotipos que ele publicou nas redes informadas no formulário (Instagram, Facebook, Google e outras) ou que enviar diretamente.",
      "O CONTRATANTE declara ter os direitos sobre esse material e responde por eventual uso indevido de conteúdo de terceiros que ele tenha publicado ou fornecido.",
      "Se o material disponível tiver qualidade baixa, a CONTRATADA avisará, e o CONTRATANTE poderá enviar arquivos melhores, aceitar imagens de bancos gratuitos ou contratar a criação à parte.",
    ],
  },
  {
    titulo: "7. Domínio, perfil e transferência",
    itens: [
      "O domínio, o Perfil da Empresa no Google e os arquivos do site ficam sob gestão da CONTRATADA durante o contrato.",
      "Mediante solicitação, a CONTRATADA transfere o domínio, o Perfil da Empresa no Google e os arquivos do site em até 7 dias úteis, sem custo de transferência, salvo taxas de terceiros. Eventuais valores em aberto continuam devidos e serão cobrados separadamente.",
    ],
  },
  {
    titulo: "8. Atraso no pagamento da mensalidade",
    itens: [
      "Do 1º ao 7º dia de atraso: lembrete por mensagem.",
      "No 15º dia: aviso por escrito e pausa nas publicações e relatórios.",
      "No 30º dia, após aviso por escrito: o site pode ser suspenso.",
      "No 90º dia: encerramento do contrato, com os arquivos guardados e disponíveis para transferência.",
      `Para reativar, o CONTRATANTE paga as mensalidades em aberto até a suspensão e uma taxa de reativação de ${brl(OFERTA.mensalidade)}, passando ao preço vigente. Meses em que o serviço ficou suspenso não são cobrados.`,
    ],
  },
  {
    titulo: "9. Desistência",
    itens: [
      "O CONTRATANTE pode desistir em até 7 dias após o pagamento da implantação e recebe o valor integral de volta.",
    ],
  },
  {
    titulo: "10. Dados pessoais",
    itens: [
      "Os dados informados são usados apenas para executar este contrato e falar com o CONTRATANTE, conforme a Política de Privacidade da Codifica e a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
    ],
  },
  {
    titulo: "11. Aceite eletrônico",
    itens: [
      "Este contrato é aceito eletronicamente no site da CONTRATADA. São registrados o nome, o CPF ou CNPJ, a data e a hora do aceite e a versão do contrato aceita, com validade nos termos da Medida Provisória 2.200-2/2001.",
    ],
  },
];
