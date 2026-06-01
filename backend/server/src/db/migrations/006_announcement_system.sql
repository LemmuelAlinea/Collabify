-- Announcement system permissions, indexes, and realtime setup.

create index if not exists announcements_class_pinned_published_idx
on public.announcements(class_id, is_pinned desc, published_at desc);

alter table public.announcements replica identity full;
alter table public.notifications replica identity full;

drop policy if exists "Professors can create announcements for own classes" on public.announcements;
drop policy if exists "Professors can update announcements for own classes" on public.announcements;
drop policy if exists "Professors can delete announcements for own classes" on public.announcements;

create policy "Professors can create announcements for own classes"
on public.announcements for insert
with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
      and c.is_archived = false
  )
);

create policy "Professors can update announcements for own classes"
on public.announcements for update
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
);

create policy "Professors can delete announcements for own classes"
on public.announcements for delete
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
