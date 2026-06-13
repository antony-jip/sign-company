-- ============================================================================
-- Factuurnummering voor de admin back-end
-- Doorlopend per jaar (F-2026-000123), opgeslagen op de order zodat een
-- herdownload van de factuur altijd hetzelfde nummer geeft.
-- Draai dit één keer in de Supabase SQL-editor.
-- ============================================================================

alter table orders add column if not exists invoice_number text unique;
alter table orders add column if not exists invoiced_at    timestamptz;

create sequence if not exists invoice_seq start 1;

-- Atomaire toewijzing: één conditionele UPDATE (WHERE invoice_number IS NULL)
-- zodat gelijktijdige factuur-downloads de sequence niet dubbel ophogen en het
-- teruggegeven nummer altijd gelijk is aan het opgeslagen nummer. nextval()
-- wordt alleen geëvalueerd voor de rij die de WHERE matcht (eerste winnaar).
create or replace function assign_invoice_number(p_order_id uuid) returns text as $$
declare
  v text;
begin
  update orders
     set invoice_number = 'F-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 6, '0'),
         invoiced_at = now()
   where id = p_order_id
     and invoice_number is null
  returning invoice_number into v;

  if v is null then
    select invoice_number into v from orders where id = p_order_id;
  end if;
  return v;
end;
$$ language plpgsql;
