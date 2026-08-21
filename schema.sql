-- Profiles table linked to Supabase Auth
CREATE TYPE user_role AS ENUM ('farmer', 'aggregator', 'distributor', 'retailer', 'regulator');

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  location TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batches table
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL, -- e.g., SK-2026-X981
  farmer_id UUID REFERENCES profiles(id),
  crop_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  harvest_date DATE NOT NULL,
  farm_location TEXT NOT NULL,
  status TEXT DEFAULT 'harvested', -- harvested, aggregated, in_transit, on_shelf, recalled
  is_recalled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supply Chain Handoffs (Immutable Audit Trail)
CREATE TABLE handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  stage TEXT NOT NULL, -- 'harvest', 'aggregation', 'logistics', 'retail'
  notes TEXT,
  location TEXT,
  prev_hash TEXT, -- Simulated blockchain immutability link
  current_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pesticide & Lab Tests
CREATE TABLE lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  tester_id UUID REFERENCES profiles(id),
  lab_name TEXT NOT NULL,
  residue_level_ppm NUMERIC NOT NULL,
  max_permissible_limit_ppm NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL,
  report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a profile securely whenever a user registers through Supabase Auth.
-- Registration sends these values in auth user metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, location, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New user'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'farmer'),
    NEW.raw_user_meta_data ->> 'location',
    NEW.raw_user_meta_data ->> 'phone_number'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

-- Allow public read access to batches, handoffs, and lab_tests for traceability
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Public batches are viewable by everyone." ON batches FOR SELECT USING (true);
CREATE POLICY "Public handoffs are viewable by everyone." ON handoffs FOR SELECT USING (true);
CREATE POLICY "Public lab_tests are viewable by everyone." ON lab_tests FOR SELECT USING (true);

-- Allow authenticated users to insert based on roles
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- (In a real application, more granular insert/update policies would be applied based on user role)
CREATE POLICY "Farmers can create their own batches" ON batches FOR INSERT TO authenticated
  WITH CHECK (farmer_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'farmer');
CREATE POLICY "Supply-chain roles can update batches" ON batches FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('aggregator', 'distributor', 'retailer'));
CREATE POLICY "Supply-chain roles can append handoffs" ON handoffs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('farmer', 'aggregator', 'distributor', 'retailer'));
CREATE POLICY "Aggregators can attach lab tests" ON lab_tests FOR INSERT TO authenticated
  WITH CHECK (tester_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'aggregator');

-- Audit records are append-only: no actor may edit or delete a recorded handoff.
