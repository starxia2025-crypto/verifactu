-- SIF/VERI*FACTU hardening helpers for PostgreSQL.
-- Apply this file after `drizzle push` in each environment:
--   psql "$DATABASE_URL" -f lib/db/sql/001_sif_immutability.sql
--
-- These triggers are intentionally stricter than the application layer. They
-- prevent silent mutation/deletion of issued fiscal data if someone bypasses
-- the API and writes directly to the database.

create or replace function prevent_issued_invoice_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('EMITTED', 'CANCELLED', 'RECTIFIED') then
    if tg_op = 'DELETE' then
      raise exception 'SIF_IMMUTABILITY: issued invoices cannot be deleted';
    end if;

    if new.invoice_number is distinct from old.invoice_number
      or new.taxpayer_id is distinct from old.taxpayer_id
      or new.series_id is distinct from old.series_id
      or new.client_id is distinct from old.client_id
      or new.subtotal is distinct from old.subtotal
      or new.vat_amount is distinct from old.vat_amount
      or new.total is distinct from old.total
      or new.issue_date is distinct from old.issue_date
      or new.status not in ('CANCELLED', 'RECTIFIED', old.status) then
      raise exception 'SIF_IMMUTABILITY: issued invoice fiscal fields cannot be modified';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_issued_invoice_update on invoices;
create trigger trg_prevent_issued_invoice_update
before update on invoices
for each row execute function prevent_issued_invoice_mutation();

drop trigger if exists trg_prevent_issued_invoice_delete on invoices;
create trigger trg_prevent_issued_invoice_delete
before delete on invoices
for each row execute function prevent_issued_invoice_mutation();

create or replace function prevent_verifactu_record_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SIF_IMMUTABILITY: verifactu records are append-only';
end;
$$;

drop trigger if exists trg_prevent_verifactu_record_update on verifactu_records;
create trigger trg_prevent_verifactu_record_update
before update on verifactu_records
for each row
when (old.status in ('ACCEPTED', 'ACCEPTED_WITH_ERRORS', 'REJECTED'))
execute function prevent_verifactu_record_mutation();

drop trigger if exists trg_prevent_verifactu_record_delete on verifactu_records;
create trigger trg_prevent_verifactu_record_delete
before delete on verifactu_records
for each row execute function prevent_verifactu_record_mutation();

create or replace function prevent_sif_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SIF_IMMUTABILITY: sif events are append-only';
end;
$$;

drop trigger if exists trg_prevent_sif_event_update on sif_events;
create trigger trg_prevent_sif_event_update
before update on sif_events
for each row execute function prevent_sif_event_mutation();

drop trigger if exists trg_prevent_sif_event_delete on sif_events;
create trigger trg_prevent_sif_event_delete
before delete on sif_events
for each row execute function prevent_sif_event_mutation();
