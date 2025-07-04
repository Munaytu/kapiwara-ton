
-- 1. Create the table to store clicks per country
CREATE TABLE public.country_clicks (
  country_code TEXT PRIMARY KEY,
  clicks BIGINT DEFAULT 0 NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.country_clicks ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows public read access
CREATE POLICY "Enable read access for all users" ON public.country_clicks
  FOR SELECT USING (true);

-- 4. Create a function to update the clicks and notify
CREATE OR REPLACE FUNCTION increment_country_clicks(p_country_code TEXT, p_clicks BIGINT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.country_clicks (country_code, clicks)
  VALUES (p_country_code, p_clicks)
  ON CONFLICT (country_code) DO UPDATE
  SET clicks = country_clicks.clicks + p_clicks;
END;
$$ LANGUAGE plpgsql;

-- 5. Set up the publication for Supabase Realtime
-- (This might already be configured, but it's good to ensure)
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
