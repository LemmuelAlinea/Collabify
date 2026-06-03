alter table public.messages replica identity full;
alter table public.attachments replica identity full;
alter table public.pinned_messages replica identity full;
alter table public.message_deletions replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.messages,
    public.attachments,
    public.pinned_messages,
    public.message_deletions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Realtime users can view accessible messages'
  ) then
    create policy "Realtime users can view accessible messages"
    on public.messages for select
    using (
      (
        class_chat_id is not null
        and exists (
          select 1
          from public.class_chats cc
          join public.classes c on c.id = cc.class_id
          where cc.id = messages.class_chat_id
            and (c.professor_id = auth.uid() or public.is_class_member(c.id, auth.uid()))
        )
      )
      or (
        group_chat_id is not null
        and exists (
          select 1
          from public.group_chats gc
          join public.groups g on g.id = gc.group_id
          join public.classes c on c.id = g.class_id
          where gc.id = messages.group_chat_id
            and (c.professor_id = auth.uid() or public.is_group_member(g.id, auth.uid()))
        )
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'attachments'
      and policyname = 'Realtime users can view accessible message attachments'
  ) then
    create policy "Realtime users can view accessible message attachments"
    on public.attachments for select
    using (
      owner_type = 'message'
      and exists (
        select 1
        from public.messages m
        where m.id = attachments.owner_id
          and (
            (
              m.class_chat_id is not null
              and exists (
                select 1
                from public.class_chats cc
                join public.classes c on c.id = cc.class_id
                where cc.id = m.class_chat_id
                  and (c.professor_id = auth.uid() or public.is_class_member(c.id, auth.uid()))
              )
            )
            or (
              m.group_chat_id is not null
              and exists (
                select 1
                from public.group_chats gc
                join public.groups g on g.id = gc.group_id
                join public.classes c on c.id = g.class_id
                where gc.id = m.group_chat_id
                  and (c.professor_id = auth.uid() or public.is_group_member(g.id, auth.uid()))
              )
            )
          )
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pinned_messages'
      and policyname = 'Realtime users can view accessible pinned messages'
  ) then
    create policy "Realtime users can view accessible pinned messages"
    on public.pinned_messages for select
    using (
      exists (
        select 1
        from public.messages m
        where m.id = pinned_messages.message_id
          and (
            (
              m.class_chat_id is not null
              and exists (
                select 1
                from public.class_chats cc
                join public.classes c on c.id = cc.class_id
                where cc.id = m.class_chat_id
                  and (c.professor_id = auth.uid() or public.is_class_member(c.id, auth.uid()))
              )
            )
            or (
              m.group_chat_id is not null
              and exists (
                select 1
                from public.group_chats gc
                join public.groups g on g.id = gc.group_id
                join public.classes c on c.id = g.class_id
                where gc.id = m.group_chat_id
                  and (c.professor_id = auth.uid() or public.is_group_member(g.id, auth.uid()))
              )
            )
          )
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'message_deletions'
      and policyname = 'Realtime users can view own message deletions'
  ) then
    create policy "Realtime users can view own message deletions"
    on public.message_deletions for select
    using (user_id = auth.uid());
  end if;
end;
$$;
