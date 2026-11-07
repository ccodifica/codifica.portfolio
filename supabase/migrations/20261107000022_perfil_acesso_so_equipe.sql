-- O pedido de acesso ao Perfil do Google é feito pela equipe no WhatsApp (decisão
-- de 07/11/2026: o passo a passo na tela confundia quem não tem Perfil). A coluna
-- perfil_acesso continua, marcada só pela equipe; a função pública sai.
drop function if exists public.pedido_perfil_acesso(text, text);
