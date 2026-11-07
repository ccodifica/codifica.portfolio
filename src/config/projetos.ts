/**
 * Fonte única do portfólio: carrossel da home, página /portfolio e a seção
 * "Projetos que já fizemos" da oferta leem daqui.
 *
 * parceria "4tuna": projetos feitos em parceria entre a 4tuna e os fundadores
 * da Codifica (autorizados pelo Pedro em 06/11/2026).
 */
import projectArcanjo from "@/assets/project-arcanjo.webp";
import projectBaile55 from "@/assets/project-baile55.webp";
import projectConsultec from "@/assets/project-consultec.webp";
import projectJardins from "@/assets/project-jardins.webp";
import projectKidstogether from "@/assets/project-kidstogether.webp";
import projectMeiodomato from "@/assets/project-meiodomato.webp";
import projectServitec from "@/assets/project-servitec.webp";
import projectOrquestra from "@/assets/project-orquestravoadora.webp";
import projectAcademia from "@/assets/project-academiacrista.webp";
import projectChoro from "@/assets/project-chorobatucada.webp";
import projectPercusamba from "@/assets/project-percusamba.webp";
import projectPercussaca from "@/assets/project-percussaca.webp";
import projectTicketBaile from "@/assets/project-ticketbaile.webp";
import projectMantovani from "@/assets/project-mantovanihub.webp";
import appKids2gether from "@/assets/app-kids2gether.webp";
import appScaleclock from "@/assets/app-scaleclock.webp";

export type CategoriaProjeto = "Site" | "Sistema" | "App";

export interface Projeto {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaProjeto;
  imagem: string;
  tags: string[];
  url?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  parceria?: "4tuna";
  corTitulo?: string;
}

export const PROJETOS: Projeto[] = [
  // ---------------- Sistemas ----------------
  {
    id: "orquestra-voadora",
    titulo: "Orquestra Voadora",
    descricao:
      "Plataforma de inscrições da oficina da Orquestra Voadora: inscrição online, pagamentos e cobranças automáticas, carteirinha digital e área do aluno com entrada por SMS.",
    categoria: "Sistema",
    imagem: projectOrquestra,
    tags: ["Inscrições", "Pagamentos", "Área do aluno", "WhatsApp"],
    url: "https://oficinaorquestravoadora2026.55jam.com.br",
    parceria: "4tuna",
  },
  {
    id: "ticket-baile",
    titulo: "Ticket Baile",
    descricao:
      "Ticketeria para bailes, festas e shows: ingresso nominal com QR code, taxas às claras e check-in rápido na porta.",
    categoria: "Sistema",
    imagem: projectTicketBaile,
    tags: ["Ingressos", "QR code", "Check-in", "Pagamentos"],
    url: "https://ticketbaile.55jam.com.br",
    parceria: "4tuna",
  },
  {
    id: "mantovanihub",
    titulo: "MantovaniHub",
    descricao:
      "Gestão da Charcutaria Mantovani: produção por lote, controle de perdas, validade e estoque, mais um cardápio digital. Instala no celular como app.",
    categoria: "Sistema",
    imagem: projectMantovani,
    tags: ["Gestão", "Estoque", "Cardápio digital", "App (PWA)"],
    url: "https://mantovanihub.vercel.app",
  },
  {
    id: "academia-crista",
    titulo: "Academia Cristã de Música",
    descricao:
      "Sistema de matrículas para escola de música: inscrição online, mensalidades, carteirinha digital e painel para a secretaria.",
    categoria: "Sistema",
    imagem: projectAcademia,
    tags: ["Matrículas", "Mensalidades", "Carteirinha"],
    url: "https://academiacrista.55jam.com.br",
    parceria: "4tuna",
  },
  {
    id: "percussaca",
    titulo: "Percussaça",
    descricao:
      "Site e inscrições da oficina do bloco Percussaça, do Mestre Fogaça, com página em vários idiomas e área do aluno.",
    categoria: "Sistema",
    imagem: projectPercussaca,
    tags: ["Inscrições", "Multilíngue", "Área do aluno"],
    url: "https://percussaca.55jam.com.br",
    parceria: "4tuna",
  },
  {
    id: "percusamba",
    titulo: "PercuSamba",
    descricao: "Plataforma da oficina de samba: inscrições da temporada, carteirinha digital e área do aluno.",
    categoria: "Sistema",
    imagem: projectPercusamba,
    tags: ["Inscrições", "Carteirinha", "Área do aluno"],
    url: "https://percusamba.55jam.com.br",
    parceria: "4tuna",
  },
  {
    id: "choro-batucada",
    titulo: "Choro Batucada",
    descricao: "Página e inscrições da Oficina Choro Batucada, com área do aluno e videoaulas.",
    categoria: "Sistema",
    imagem: projectChoro,
    tags: ["Inscrições", "Videoaulas", "Área do aluno"],
    url: "https://chorobatucada.55jam.com.br",
    parceria: "4tuna",
  },

  // ---------------- Sites ----------------
  {
    id: "arcanjo",
    titulo: "Arcanjo Sociedade de Advogados",
    descricao:
      "Site institucional para escritório especializado em Direito Tributário, Regulatório, Econômico e Financeiro. Identidade sóbria para transmitir credibilidade.",
    categoria: "Site",
    imagem: projectArcanjo,
    tags: ["Institucional", "Responsivo"],
    url: "https://www.arcanjoadvogados.com.br/",
  },
  {
    id: "servitec",
    titulo: "Servitec Dinamômetro",
    descricao:
      "Site para fabricante de dinamômetros automotivos desde 1988, com catálogo de produtos, blog técnico, suporte e seleção de idiomas.",
    categoria: "Site",
    imagem: projectServitec,
    tags: ["Catálogo", "Blog", "Multilíngue"],
    url: "https://www.servitecdinamometro.com.br/",
  },
  {
    id: "consultec",
    titulo: "Consultec Soluções",
    descricao:
      "Landing page para empresa de serviços topográficos e agronômicos, com foco em segurança jurídica e crédito para propriedades rurais.",
    categoria: "Site",
    imagem: projectConsultec,
    tags: ["Landing page", "SEO", "Formulários"],
    url: "https://www.consultecsolucoes.com/",
  },
  {
    id: "jardins",
    titulo: "Jardins Dona Isabel",
    descricao:
      "Landing page de alto padrão para empreendimento sustentável na Serra Gaúcha, com tipografia editorial e experiência visual imersiva.",
    categoria: "Site",
    imagem: projectJardins,
    tags: ["Landing page", "Animações", "WhatsApp"],
    url: "https://www.jardinsdonaisabel.com.br/",
  },
  {
    id: "meio-do-mato",
    titulo: "Meio do Mato Eventos",
    descricao:
      "Landing page para espaço de eventos na Ilha de Guaratiba (RJ), com galeria, depoimentos e pedido de orçamento direto no WhatsApp.",
    categoria: "Site",
    imagem: projectMeiodomato,
    tags: ["Landing page", "Galeria", "WhatsApp"],
    url: "https://lp.meiodomato.com.br/",
  },
  {
    id: "kids2gether-site",
    titulo: "Kids2gether",
    descricao:
      "Portal de turismo familiar com destinos, dicas para viajar com crianças e agência integrada, complementado por aplicativo próprio.",
    categoria: "Site",
    imagem: projectKidstogether,
    tags: ["Portal", "Conteúdo", "Integração com app"],
    url: "https://www.kids2gether.com.br/",
  },
  {
    id: "baile55",
    titulo: "Baile 55",
    descricao:
      "Plataforma de ensino musical com cursos online de teoria e improvisação, integrada ao app ScaleClock. Suporte a vários idiomas.",
    categoria: "Site",
    imagem: projectBaile55,
    tags: ["Cursos online", "Multilíngue"],
    url: "https://baile55.com/",
  },

  // ---------------- Apps ----------------
  {
    id: "kids2gether-app",
    titulo: "Kids2gether",
    descricao: "Aplicativo para famílias que viajam com crianças: destinos, dicas, novidades e roteiros na palma da mão.",
    categoria: "App",
    imagem: appKids2gether,
    tags: ["iOS", "Android"],
    appStoreUrl: "https://apps.apple.com/br/app/kids2gether/id1554942484",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.kids2gether&hl=pt_BR",
    corTitulo: "text-violet-400",
  },
  {
    id: "scaleclock",
    titulo: "Scaleclock",
    descricao: "App de escalas musicais: visualização interativa de escalas, modos e tonalidades para músicos e estudantes.",
    categoria: "App",
    imagem: appScaleclock,
    tags: ["iOS", "Android"],
    appStoreUrl: "https://apps.apple.com/br/app/scaleclock/id1464221197",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.scaleclock&hl=pt_BR&gl=US",
    corTitulo: "text-white",
  },
];

export const PROJETOS_WEB = PROJETOS.filter((p) => p.categoria !== "App");
export const PROJETOS_APP = PROJETOS.filter((p) => p.categoria === "App");
