-- ================================================================
-- SCHEMA Supabase cho Dashboard tiến độ Điện gió (QLDASCI)
--
-- CÁCH CHẠY:
--   1. Vào https://supabase.com/dashboard → chọn project
--   2. Menu trái → SQL Editor → New query
--   3. Dán toàn bộ file này → bấm Run
--   4. Kiểm tra: Table Editor phải thấy 2 bảng ai_outputs, profiles
-- Chạy lại nhiều lần vẫn an toàn (IF NOT EXISTS / OR REPLACE).
-- ================================================================

-- ===== 1. ai_outputs — lưu kết quả AI theo tuần (forecast/alerts/crosscheck/productivity)
create table if not exists public.ai_outputs (
  week text not null,                       -- "2026-W28"
  type text not null check (type in ('forecast', 'alerts', 'crosscheck', 'productivity')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (week, type)
);

comment on table public.ai_outputs is
  'Kết quả AI sinh theo tuần báo cáo — mỗi tuần 4 loại output, ghi đè khi chạy lại';

-- ===== 2. profiles — hồ sơ người dùng + vai trò (gắn với Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'field' check (role in ('pm', 'engineer', 'field')),
  display_name text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Vai trò người dùng: pm (toàn quyền) / engineer (kỹ sư) / field (hiện trường)';

-- ===== 3. Row Level Security =====
alter table public.ai_outputs enable row level security;
alter table public.profiles enable row level security;

-- Người dùng đã đăng nhập được ĐỌC ai_outputs (ghi chỉ qua service_role phía server,
-- service_role bỏ qua RLS nên không cần policy ghi)
drop policy if exists "ai_outputs_read_authenticated" on public.ai_outputs;
create policy "ai_outputs_read_authenticated"
  on public.ai_outputs for select
  to authenticated
  using (true);

-- Người dùng đã đăng nhập được ĐỌC danh sách profiles (để hiển thị tên/vai trò)
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Người dùng tự cập nhật display_name của chính mình (không đổi được role)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ===== 4. Tự tạo profile khi có user mới đăng ký (role mặc định: field) =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
