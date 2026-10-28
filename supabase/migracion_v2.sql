-- ============================================================
-- VIDA Y MINISTERIO — MIGRACIÓN v2
-- (multi-participante por parte + control de sincronización wol)
--
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- Idempotente: se puede pegar más de una vez sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Una parte puede tener VARIOS participantes (ej. Seamos
--    mejores maestros con dos personas)
-- ------------------------------------------------------------
alter table reunion_partes
  add column if not exists participante_ids uuid[] not null default '{}';

-- Pasamos lo que ya estaba cargado a la lista nueva
update reunion_partes
   set participante_ids = array[participante_id]
 where participante_id is not null
   and participante_ids = '{}'::uuid[];

-- ------------------------------------------------------------
-- 2) Índice para buscar rápido por participante
-- ------------------------------------------------------------
drop index if exists idx_rp_asignado;
create index if not exists idx_rp_asignados
  on reunion_partes using gin (participante_ids);

-- ------------------------------------------------------------
-- 3) La columna vieja (una sola persona) ya no se usa
-- ------------------------------------------------------------
alter table reunion_partes drop column if exists participante_id;

-- ------------------------------------------------------------
-- 4) Si algún día se borra un participante, lo sacamos de las
--    listas para no dejar ids huérfanos
-- ------------------------------------------------------------
create or replace function vm_limpiar_asignaciones() returns trigger as $$
begin
  update reunion_partes
     set participante_ids = array_remove(participante_ids, old.id)
   where old.id = any (participante_ids);
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_limpiar_asign on participantes;
create trigger trg_limpiar_asign
  after delete on participantes
  for each row execute function vm_limpiar_asignaciones();

-- ------------------------------------------------------------
-- 5) Control de la programación copiada de wol.jw.org
-- ------------------------------------------------------------
alter table reuniones add column if not exists wol_doc_id     text;
alter table reuniones add column if not exists sincronizado_en timestamptz;

-- ------------------------------------------------------------
-- Listo. En la app debería verse:
--   · Partes con varias personas (Seamos mejores maestros)
--   · Presidente arriba de la guía
--   · Historial / top 5 de los que hacen más tiempo sin participar
--   · Programación sincronizada de wol.jw.org
-- ------------------------------------------------------------
