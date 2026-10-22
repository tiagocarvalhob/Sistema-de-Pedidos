-- Opcional: banco gratuito no Supabase para o servidor não perder pedidos, contas e garçons
-- quando a hospedagem gratuita reinicia.
-- Cole no Supabase em: SQL Editor > New query > Run.
create table if not exists subarashi_estado (
  id integer primary key,
  dados jsonb not null,
  atualizado timestamptz not null default now()
);

-- Só o servidor (com a chave "service_role") acessa esta tabela.
alter table subarashi_estado enable row level security;
