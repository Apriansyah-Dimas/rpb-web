-- Allow admin users to see all saved history rows.
drop policy if exists "rpb_saved_summaries_select_own" on public.rpb_saved_summaries;
create policy "rpb_saved_summaries_select_own"
on public.rpb_saved_summaries for select
to authenticated
using (user_id = auth.uid() or public.is_admin());
