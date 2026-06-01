-- Creates application user/profile rows whenever Supabase Auth creates a user.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  first_name text;
  last_name text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('student', 'professor')
      then (new.raw_user_meta_data ->> 'role')::public.user_role
    else 'student'::public.user_role
  end;
  first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');

  insert into public.users (id, email, role)
  values (new.id, coalesce(new.email, ''), requested_role)
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  insert into public.profiles (
    user_id,
    student_number,
    employee_number,
    first_name,
    last_name,
    year_level,
    section
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'student_number', ''),
    nullif(new.raw_user_meta_data ->> 'employee_number', ''),
    coalesce(first_name, 'New'),
    coalesce(last_name, 'User'),
    nullif(new.raw_user_meta_data ->> 'year_level', '')::int,
    nullif(new.raw_user_meta_data ->> 'section', '')
  )
  on conflict (user_id) do update
  set
    student_number = excluded.student_number,
    employee_number = excluded.employee_number,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    year_level = excluded.year_level,
    section = excluded.section,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
