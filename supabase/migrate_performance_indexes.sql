create index if not exists idx_rpb_other_items_category_name
on public.rpb_other_items (category, name);

create index if not exists idx_rpb_saved_summaries_user_updated_at
on public.rpb_saved_summaries (user_id, updated_at desc);

create index if not exists idx_rpb_saved_summaries_updated_at
on public.rpb_saved_summaries (updated_at desc);

create index if not exists idx_rpb_formula_variables_section_sort
on public.rpb_formula_variables (section, sort_order);
