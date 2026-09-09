-- Enable Supabase Realtime for sinking_funds so /funds and the dashboard
-- nudge update live across tabs when contributions or targets change.
ALTER PUBLICATION supabase_realtime ADD TABLE public.sinking_funds;
