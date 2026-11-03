
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
create table public.stalls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);
create table public.user_stalls (
  user_id uuid not null,
  stall_id uuid not null references public.stalls(id) on delete cascade,
  primary key (user_id, stall_id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  unit text not null default 'pcs',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls(id) on delete cascade,
  user_id uuid not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit text not null,
  quantity numeric not null check (quantity > 0),
  remark text
);

grant select, insert, update, delete on public.profiles, public.user_roles, public.stalls, public.user_stalls, public.categories, public.products, public.orders, public.order_items to authenticated;
grant all on public.profiles, public.user_roles, public.stalls, public.user_stalls, public.categories, public.products, public.orders, public.order_items to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.stalls enable row level security;
alter table public.user_stalls enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create or replace function public.owns_stall(_stall uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_stalls where user_id = auth.uid() and stall_id = _stall)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'user');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- profiles
create policy "own or admin read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- roles
create policy "own or admin read roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- stalls
create policy "read assigned stalls" on public.stalls for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.owns_stall(id));
create policy "admin manage stalls" on public.stalls for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- user_stalls
create policy "read own assignments" on public.user_stalls for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage assignments" on public.user_stalls for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- categories & products
create policy "read categories" on public.categories for select to authenticated using (true);
create policy "admin manage categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read products" on public.products for select to authenticated using (true);
create policy "admin manage products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- orders
create policy "read orders" on public.orders for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.owns_stall(stall_id));
create policy "create orders for own stall" on public.orders for insert to authenticated
  with check (user_id = auth.uid() and public.owns_stall(stall_id));
create policy "admin update orders" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "admin delete orders" on public.orders for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));
-- order items
create policy "read items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (public.has_role(auth.uid(),'admin') or public.owns_stall(o.stall_id))));
create policy "insert items" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
