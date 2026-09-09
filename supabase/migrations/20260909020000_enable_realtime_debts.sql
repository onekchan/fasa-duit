-- Enable Supabase Realtime for the debts table so /debts and the debt
-- comparator update live as debts change.
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
