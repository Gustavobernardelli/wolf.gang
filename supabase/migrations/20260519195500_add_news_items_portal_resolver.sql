-- Migration: resolve news_items.portal from feed_source_options ID
create or replace function public.resolve_news_item_portal()
returns trigger as $$
declare
  v_name text;
begin
  if NEW.portal ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select name into v_name from public.feed_source_options where id = NEW.portal::uuid;
    if v_name is not null then
      NEW.portal := v_name;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Drop if exists to avoid errors
drop trigger if exists resolve_news_item_portal_trigger on public.news_items;

create trigger resolve_news_item_portal_trigger
  before insert on public.news_items
  for each row
  execute function public.resolve_news_item_portal();
