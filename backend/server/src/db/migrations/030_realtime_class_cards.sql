alter table public.classes replica identity full;
alter table public.class_members replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.classes,
    public.class_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
