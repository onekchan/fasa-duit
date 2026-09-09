-- Enable Supabase Realtime for the transactions table.
-- The `supabase_realtime` publication is auto-created by Supabase; adding a
-- table to it makes INSERT/UPDATE/DELETE events stream to subscribed clients.
-- RLS still enforces which rows a client can see, so this is safe to enable
-- for user-scoped tables.

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
