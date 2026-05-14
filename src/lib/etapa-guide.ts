import { ProjectStatus } from "@/types/client-area";

/**
 * Guia descritivo de cada etapa do projeto.
 *
 * Renderizado tanto no painel admin (orientando a Codifica sobre o que preencher)
 * quanto no painel do cliente (explicando o que acontece em cada fase).
 *
 * NÃO confunda com as documentações dinâmicas (`Project.documentacoes`) — aquelas
 * são preenchidas pelo admin e variam por projeto. Este aqui é texto fixo do
 * processo da Codifica.
 */
export interface EtapaGuide {
  titulo: string;
  descricao: string;
  oQueFazemos: string[];
  paraFinalizar: string[];
}

export const ETAPA_GUIDE: Record<ProjectStatus, EtapaGuide> = {
  aguardando_analise: {
    titulo: "Aguardando análise",
    descricao:
      "Recebemos seu projeto e nossa equipe está avaliando os detalhes pra entender escopo, viabilidade técnica e prazos realistas.",
    oQueFazemos: [
      "Lemos o briefing inicial e mapeamos pontos importantes",
      "Avaliamos viabilidade técnica e desafios potenciais",
      "Identificamos lacunas de informação que precisamos cobrir",
    ],
    paraFinalizar: [
      "Briefing inicial confirmado com o cliente",
      "Escopo macro do projeto definido",
      "Estimativa inicial de prazo e orçamento validada",
    ],
  },
  briefing: {
    titulo: "Briefing",
    descricao:
      "Estamos detalhando todos os requisitos do projeto pra alinhar exatamente o que vai ser entregue, evitando ambiguidades.",
    oQueFazemos: [
      "Refinamos a lista de funcionalidades necessárias",
      "Coletamos referências visuais, de identidade e de UX",
      "Documentamos requisitos técnicos e regras de negócio",
    ],
    paraFinalizar: [
      "Lista de funcionalidades aprovada pelo cliente",
      "Identidade visual e referências validadas",
      "Cronograma detalhado do projeto definido",
    ],
  },
  design: {
    titulo: "Design",
    descricao:
      "Construindo a interface visual e a experiência do usuário com base no briefing aprovado.",
    oQueFazemos: [
      "Definimos paleta de cores, tipografia e sistema de componentes",
      "Criamos wireframes e protótipos das telas principais",
      "Iteramos com base no feedback do cliente até a aprovação",
    ],
    paraFinalizar: [
      "Identidade visual aprovada",
      "Wireframes/protótipos validados pelo cliente",
      "Sistema de design documentado e pronto pra desenvolvimento",
    ],
  },
  desenvolvimento: {
    titulo: "Desenvolvimento",
    descricao:
      "Mão na massa — construímos seu projeto seguindo o design e os requisitos aprovados.",
    oQueFazemos: [
      "Implementamos as funcionalidades acordadas",
      "Realizamos testes contínuos a cada entrega",
      "Compartilhamos previews periódicos do progresso",
    ],
    paraFinalizar: [
      "Todas as funcionalidades implementadas",
      "Testes internos passando",
      "Ambiente de homologação disponível pra revisão do cliente",
    ],
  },
  revisao: {
    titulo: "Revisão",
    descricao:
      "Validando tudo com o cliente, corrigindo ajustes finais e preparando pra entrega em produção.",
    oQueFazemos: [
      "Apresentamos o produto finalizado pro cliente",
      "Coletamos e implementamos ajustes pontuais",
      "Realizamos testes de qualidade e performance",
    ],
    paraFinalizar: [
      "Aprovação final do cliente",
      "Bugs e ajustes finais corrigidos",
      "Documentação técnica e manual de uso entregues",
    ],
  },
  entrega: {
    titulo: "Entrega",
    descricao:
      "Configurando ambiente de produção, fazendo o deploy final e transferindo acessos.",
    oQueFazemos: [
      "Configuração de domínio e hospedagem",
      "Deploy em ambiente de produção",
      "Transferência de acessos, credenciais e propriedade",
    ],
    paraFinalizar: [
      "Projeto rodando em produção com estabilidade",
      "Cliente com acesso a todas as ferramentas e contas",
      "Onboarding e manual de uso realizados",
    ],
  },
  concluido: {
    titulo: "Concluído",
    descricao:
      "Projeto entregue. Acompanhamos os primeiros dias em produção e ficamos à disposição pra suporte e melhoria contínua.",
    oQueFazemos: [
      "Acompanhamos os primeiros dias em produção",
      "Damos suporte a dúvidas pontuais do cliente",
      "Avaliamos resultados e mapeamos próximas oportunidades",
    ],
    paraFinalizar: [
      "Cliente confortável com o produto em uso",
      "Feedback final coletado",
      "Garantia e suporte definidos para continuidade",
    ],
  },
};
