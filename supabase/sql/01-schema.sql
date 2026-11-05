-- Run once in a NEW Supabase project's SQL Editor, before 02-content.sql.
-- No real customer, maker, banking or payment information is included.
begin;

create table public.makers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  craft text not null,
  location text not null default 'India',
  initials text not null default '',
  story text not null,
  quote text not null default '',
  image text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references public.makers(id),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  subtitle text not null default '',
  category text not null,
  price_paise integer not null check (price_paise between 100 and 100000000),
  image text not null,
  materials text not null default '',
  dimensions text not null default '',
  care text not null default '',
  significance text not null default '',
  description text not null,
  delivery text not null default 'Delivery included within India. Contact the KCG team for dispatch estimates.',
  tag text not null default 'Made by hand',
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index products_maker_id_idx on public.products(maker_id);
create index products_collection_idx on public.products(sort_order) where published;

-- Kept separate from public maker profiles: never expose payment account IDs.
create table public.maker_payment_accounts (
  maker_id uuid primary key references public.makers(id),
  razorpay_account_id text not null check (razorpay_account_id ~ '^acc_[A-Za-z0-9]+$'),
  enabled boolean not null default false
);
create table public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  date text not null,
  category text not null,
  "readingTime" text not null default '3 min read',
  excerpt text not null,
  "featuredImage" text not null,
  content text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 30),
  updated_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  idempotency_key uuid not null,
  status text not null default 'creating_payment' check (status in ('creating_payment','pending_payment','payment_setup_review','paid','shipped','delivered','cancelled','refunded','partially_refunded')),
  total_paise integer not null check (total_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  shipping jsonb not null,
  provider_order_id text unique,
  provider_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);
create index orders_user_id_idx on public.orders(user_id,created_at desc);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  product_id uuid not null references public.products(id),
  maker_id uuid not null references public.makers(id),
  title text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_paise integer not null check (unit_price_paise > 0),
  unique(order_id,product_id)
);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_product_id_idx on public.order_items(product_id);
create index order_items_maker_id_idx on public.order_items(maker_id);
create table public.payment_events (
  id text primary key,
  event_type text not null,
  provider_order_id text not null,
  created_at timestamptz not null default now()
);
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index newsletter_email_lower_idx on public.newsletter_subscribers(lower(email));
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  topic text not null check (topic in ('Volunteering','Donation enquiry','General enquiry','Order support','Maker partnership','Program support','Corporate partnership')),
  message text not null check (char_length(message) between 10 and 4000),
  amount_paise bigint check (amount_paise between 100 and 1000000000),
  created_at timestamptz not null default now()
);

alter table public.makers enable row level security;
alter table public.products enable row level security;
alter table public.maker_payment_accounts enable row level security;
alter table public.journal_posts enable row level security;
alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.enquiries enable row level security;

-- Revoke default Supabase grants first, then expose only the operations in use.
revoke all on public.makers,public.products,public.maker_payment_accounts,public.journal_posts,public.carts,public.orders,public.order_items,public.payment_events,public.newsletter_subscribers,public.enquiries from anon,authenticated;
grant select on public.makers,public.products,public.journal_posts to anon,authenticated;
grant select,insert,update,delete on public.carts to authenticated;
grant select on public.orders,public.order_items to authenticated;
grant insert (email) on public.newsletter_subscribers to anon,authenticated;
grant insert (name,email,topic,message,amount_paise) on public.enquiries to anon,authenticated;
grant all on public.makers,public.products,public.maker_payment_accounts,public.journal_posts,public.carts,public.orders,public.order_items,public.payment_events,public.newsletter_subscribers,public.enquiries to service_role;

create policy "Published maker stories" on public.makers for select to anon,authenticated using (published);
create policy "Published pieces and makers" on public.products for select to anon,authenticated using (published and exists(select 1 from public.makers m where m.id=maker_id and m.published));
create policy "Published journal" on public.journal_posts for select to anon,authenticated using (published);
create policy "Read your bag" on public.carts for select to authenticated using ((select auth.uid())=user_id);
create policy "Create your bag" on public.carts for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Update your bag" on public.carts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Delete your bag" on public.carts for delete to authenticated using ((select auth.uid())=user_id);
create policy "Your orders" on public.orders for select to authenticated using ((select auth.uid())=user_id);
create policy "Your order details" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy "Subscribe with email only" on public.newsletter_subscribers for insert to anon,authenticated with check (true);
create policy "Send an enquiry" on public.enquiries for insert to anon,authenticated with check (true);

-- SERVICE-ROLE ONLY. Price calculation and stock reservation happen atomically.
-- Security invoker retains the caller's permissions; browsers cannot execute it.
create function public.prepare_checkout(p_user_id uuid,p_key uuid,p_items jsonb,p_shipping jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  existing public.orders;
  piece public.products;
  item record;
  new_id uuid;
  total bigint := 0;
  transfers jsonb;
begin
  if p_user_id is null or p_key is null then raise exception 'A verified account is required'; end if;
  -- Serialize duplicate/retried requests for this user and idempotency key.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || p_key::text,0));
  select * into existing from public.orders where user_id=p_user_id and idempotency_key=p_key;
  if found then
    return jsonb_build_object('order_id',existing.id,'provider_order_id',existing.provider_order_id,'amount',existing.total_paise,'status',existing.status,'created',false);
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Choose between 1 and 30 pieces'; end if;
  if p_shipping is null or jsonb_typeof(p_shipping) <> 'object' then raise exception 'Delivery details are required'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) e where jsonb_typeof(e->'quantity') <> 'number' or (e->>'quantity') !~ '^[1-9][0-9]?$' or (e->>'product_id') is null) then raise exception 'Invalid bag quantity'; end if;
  if (select count(*) from jsonb_array_elements(p_items)) <> (select count(distinct e->>'product_id') from jsonb_array_elements(p_items) e) then raise exception 'Duplicate bag items'; end if;
  -- Lock products in deterministic order to avoid deadlocks across multi-maker bags.
  for item in select (e->>'product_id')::uuid as product_id,(e->>'quantity')::integer as quantity from jsonb_array_elements(p_items) e order by (e->>'product_id')::uuid loop
    if item.quantity not between 1 and 10 then raise exception 'Maximum 10 of each piece'; end if;
    select * into piece from public.products where id=item.product_id for update;
    if not found or not piece.published or not exists(select 1 from public.makers where id=piece.maker_id and published) then raise exception 'A piece is no longer available'; end if;
    if piece.stock < item.quantity then raise exception 'Not enough stock for %',piece.title; end if;
    if not exists(select 1 from public.maker_payment_accounts where maker_id=piece.maker_id and enabled) then raise exception 'This maker is not ready to accept payments yet'; end if;
    total := total + piece.price_paise::bigint * item.quantity;
  end loop;
  if total > 100000000 then raise exception 'Please contact us for orders above ₹10 lakh'; end if;
  insert into public.orders(user_id,idempotency_key,total_paise,shipping) values(p_user_id,p_key,total,p_shipping) returning id into new_id;
  for item in select (e->>'product_id')::uuid as product_id,(e->>'quantity')::integer as quantity from jsonb_array_elements(p_items) e loop
    select * into piece from public.products where id=item.product_id;
    insert into public.order_items(order_id,product_id,maker_id,title,quantity,unit_price_paise) values(new_id,piece.id,piece.maker_id,piece.title,item.quantity,piece.price_paise);
    update public.products set stock=stock-item.quantity where id=piece.id;
  end loop;
  select jsonb_agg(t) into transfers from (
    select a.razorpay_account_id as account,sum(i.quantity::bigint*i.unit_price_paise) as amount,'INR' as currency,false as on_hold
    from public.order_items i join public.maker_payment_accounts a on a.maker_id=i.maker_id where i.order_id=new_id group by a.razorpay_account_id
  ) t;
  return jsonb_build_object('order_id',new_id,'amount',total,'transfers',transfers,'status','creating_payment','created',true);
end;
$$;

-- Used only for a provider's definitive order-creation rejection, BEFORE an order
-- exists at the provider. Never release stock for an uncertain/abandoned payment.
create function public.cancel_uncreated_checkout(p_order_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare o public.orders; item record;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.status <> 'creating_payment' or o.provider_order_id is not null then return; end if;
  for item in select * from public.order_items where order_id=p_order_id order by product_id loop
    update public.products set stock=stock+item.quantity where id=item.product_id;
  end loop;
  update public.orders set status='cancelled' where id=p_order_id;
end;
$$;

create function public.confirm_payment(p_provider_order_id text,p_payment_id text,p_amount integer,p_event_id text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.orders;
begin
  select * into o from public.orders where provider_order_id=p_provider_order_id for update;
  if not found then raise exception 'Order has not been linked yet; retry webhook'; end if;
  if o.total_paise <> p_amount then raise exception 'Payment amount mismatch'; end if;
  if o.provider_payment_id is not null and o.provider_payment_id <> p_payment_id then raise exception 'Payment reference mismatch'; end if;
  if o.status in ('cancelled','refunded','partially_refunded') then raise exception 'Order requires manual reconciliation'; end if;
  insert into public.payment_events(id,event_type,provider_order_id) values(p_event_id,'payment.captured',p_provider_order_id) on conflict(id) do nothing;
  -- Do not regress shipped/delivered orders when a webhook is retried.
  update public.orders set status=case when status in ('creating_payment','pending_payment','payment_setup_review') then 'paid' else status end,provider_payment_id=p_payment_id,paid_at=coalesce(paid_at,now()) where id=o.id;
  return o.id;
end;
$$;

revoke all on function public.prepare_checkout(uuid,uuid,jsonb,jsonb),public.cancel_uncreated_checkout(uuid),public.confirm_payment(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.prepare_checkout(uuid,uuid,jsonb,jsonb),public.cancel_uncreated_checkout(uuid),public.confirm_payment(text,text,integer,text) to service_role;

commit;
