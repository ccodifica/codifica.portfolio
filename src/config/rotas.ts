/**
 * Rotas de acesso. O painel admin fica num endereço que não aparece em nenhum
 * menu (só quem tem o link chega lá) e, mesmo assim, exige login com e-mail
 * autorizado em public.admins_autorizados.
 */
export const ROTAS = {
  produto: "/presenca-no-google", // destino de todo botão "Quero meu site"
  comecar: "/comecar", // formulário da prévia (só a partir da página do produto)
  entrar: "/entrar",
  minhaArea: "/minha-area",
  admin: "/painel-codifica", // abas: ?aba=sistemas, ?aba=funil (padrão: sites)
  // área completa (projetos de sistema), mantida do Espaço do Cliente antigo
  painelSistema: "/espaco-do-cliente/painel",
};
