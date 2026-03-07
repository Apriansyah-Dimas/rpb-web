-- Allow admin users to delete saved history rows.
drop policy if exists "rpb_saved_summaries_delete_own" on public.rpb_saved_summaries;
create policy "rpb_saved_summaries_delete_own"
on public.rpb_saved_summaries for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());
