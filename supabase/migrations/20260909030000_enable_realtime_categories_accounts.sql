-- Enable Supabase Realtime for categories + accounts so Settings changes
-- propagate live to the ledger's category/account pickers and the dashboard.
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
