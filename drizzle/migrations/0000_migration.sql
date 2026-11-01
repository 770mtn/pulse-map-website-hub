
create type public.app_role as enum ('admin','area_manager','staff');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_staff(_user_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- first user becomes admin
create or replace function public.handle_first_admin() returns trigger language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from public.user_roles) then insert into public.user_roles(user_id,role) values (new.id,'admin'); end if; return new; end $$;
create trigger on_auth_user_first_admin after insert on auth.users for each row execute function public.handle_first_admin();

create table public.products (id uuid primary key default gen_random_uuid(), name text not null, description text, image_url text, price numeric, special_price numeric, available boolean not null default true, orderable boolean not null default true, installable boolean not null default false, visible boolean not null default true, sort_order int not null default 0, created_at timestamptz not null default now());
grant select on public.products to anon, authenticated; grant insert,update,delete on public.products to authenticated; grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public visible products" on public.products for select to anon, authenticated using (visible or public.is_staff(auth.uid()));
create policy "staff manage products" on public.products for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.activists (id uuid primary key default gen_random_uuid(), name text not null, phone text not null, address text, city text, lat double precision, lng double precision, service_radius_km numeric not null default 10, does_install boolean not null default false, active boolean not null default true, notes text, created_at timestamptz not null default now());
grant select,insert,update,delete on public.activists to authenticated; grant all on public.activists to service_role;
alter table public.activists enable row level security;
create policy "staff activists" on public.activists for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.requests (id uuid primary key default gen_random_uuid(), track_token text not null unique default encode(gen_random_bytes(12),'hex'), full_name text not null, phone text not null, address text not null, street text, house_number text, city text, zip text, lat double precision, lng double precision, wants_install boolean not null default false, notes text, status text not null default 'new', urgent boolean not null default false, activist_ids uuid[] not null default '{}', sent_to_activists_at timestamptz, followup_due_at timestamptz, followup_sent_at timestamptz, customer_response text, admin_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select,update,delete on public.requests to authenticated; grant all on public.requests to service_role;
alter table public.requests enable row level security;
create policy "staff requests" on public.requests for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.request_items (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade, product_id uuid references public.products(id) on delete set null, product_name text not null, quantity int not null default 1);
grant select on public.request_items to authenticated; grant all on public.request_items to service_role;
alter table public.request_items enable row level security;
create policy "staff items" on public.request_items for select to authenticated using (public.is_staff(auth.uid()));

create table public.request_events (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade, event text not null, created_at timestamptz not null default now());
grant select,insert on public.request_events to authenticated; grant all on public.request_events to service_role;
alter table public.request_events enable row level security;
create policy "staff events" on public.request_events for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.sms_templates (key text primary key, label text not null, body text not null);
grant select,update on public.sms_templates to authenticated; grant all on public.sms_templates to service_role;
alter table public.sms_templates enable row level security;
create policy "staff templates" on public.sms_templates for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.sms_log (id uuid primary key default gen_random_uuid(), to_phone text not null, body text not null, kind text, status text not null, response text, created_at timestamptz not null default now());
grant select on public.sms_log to authenticated; grant all on public.sms_log to service_role;
alter table public.sms_log enable row level security;
create policy "staff sms log" on public.sms_log for select to authenticated using (public.is_staff(auth.uid()));

create table public.phone_otps (id uuid primary key default gen_random_uuid(), phone text not null, code text not null, attempts int not null default 0, verified boolean not null default false, verify_token text, expires_at timestamptz not null, created_at timestamptz not null default now());
grant all on public.phone_otps to service_role;
alter table public.phone_otps enable row level security;

create table public.settings (id int primary key default 1, activists_per_request int not null default 3, followup_business_days int not null default 5, show_public_map boolean not null default false, admin_phone text, hero_title text not null default 'הנה זה משיח בא', hero_subtitle text not null default 'מגיע עד אליך לבית', constraint single check (id=1));
grant select on public.settings to anon, authenticated; grant update on public.settings to authenticated; grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "read settings" on public.settings for select to anon, authenticated using (true);
create policy "admin settings" on public.settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.settings(id) values (1);

insert into public.sms_templates(key,label,body) values
('otp','קוד אימות למזמין','קוד האימות שלך: {code}'),
('activist','בקשה חדשה לפעיל','בקשה חדשה להפצה!\n{name} {phone}\n{address}\nמוצרים: {items}\nהתקנה: {install}\nהערות: {notes}\nנא להתקשר למזמין.'),
('customer_confirm','אישור למזמין','תודה {name}! בקשתך התקבלה ונמסרה לפעילים באזורך. מעקב: {link}'),
('customer_followup','מעקב אחרי 5 ימי עסקים','שלום {name}, האם פעיל יצר איתך קשר בנוגע להזמנה? נא לעדכן כאן: {link}'),
('admin_alert','התראה למנהל','התראה: בקשה ללא מענה – {name} {phone}, {address}. {reason}');

insert into public.products(name,description,price,installable,sort_order) values
('דגל משיח','דגל צבעוני לתלייה במרפסת או בחלון',0,true,1),
('שלט גדול','שלט ״הנה זה משיח בא״ לחזית הבית',0,true,2),
('מדבקה לרכב','מדבקת קמפיין לרכב',0,false,3);
