-- Custom Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('farmer', 'aggregator', 'distributor', 'retailer', 'regulator');
  END IF;
END $$;

-- Drop Legacy Tables
DROP TABLE IF EXISTS public.lab_tests CASCADE;
DROP TABLE IF EXISTS public.batch_handoffs CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL,
  location TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batches Table (Farmer Harvest Data)
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  farmer_id UUID REFERENCES public.profiles(id),
  crop_name TEXT NOT NULL,
  harvest_date DATE NOT NULL,
  farm_location TEXT NOT NULL,
  total_weight_kg NUMERIC NOT NULL,
  status TEXT DEFAULT 'harvested',
  is_recalled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Handoffs Table (Aggregator / Distributor Tracking)
CREATE TABLE public.batch_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  handler_id UUID REFERENCES public.profiles(id),
  stage TEXT NOT NULL,
  notes TEXT,
  assigned_distributor_name TEXT,
  quantity_kg NUMERIC,
  assigned_retailer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Tests Table
CREATE TABLE public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  tester_id UUID REFERENCES public.profiles(id),
  lab_name TEXT NOT NULL,
  residue_ppm NUMERIC NOT NULL,
  max_limit_ppm NUMERIC NOT NULL,
  test_status TEXT NOT NULL CHECK (test_status IN ('PASS', 'FAIL')),
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
