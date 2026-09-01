-- STREET BARBER DATABASE SCHEMA & SEED DATA
-- Run this script in the Supabase SQL Editor to initialize the database.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. BUSINESS SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.business_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    shop_name text NOT NULL DEFAULT 'Street Barber',
    phone text DEFAULT '+1 (555) 123-4567',
    whatsapp text DEFAULT '+15551234567',
    address text DEFAULT '123 Grunge Avenue, Metro City',
    map_url text DEFAULT 'https://maps.google.com',
    instagram text DEFAULT 'https://instagram.com/streetbarber',
    booking_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BUSINESS HOURS TABLE
CREATE TABLE IF NOT EXISTS public.business_hours (
    id serial PRIMARY KEY,
    day_of_week integer NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Sunday, 1: Monday, ..., 6: Saturday
    opening_time time without time zone,
    closing_time time without time zone,
    closed boolean DEFAULT false NOT NULL
);

-- 3. PROFILES TABLE (Staff and Owner Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    role text NOT NULL CHECK (role IN ('owner', 'staff')),
    avatar_url text,
    speciality text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    image_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference text NOT NULL UNIQUE,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    service_id uuid NOT NULL REFERENCES public.services(id),
    barber_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nullable for "Any Available Barber" (Unassigned)
    appointment_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    booked_price numeric NOT NULL CHECK (booked_price >= 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. STAFF AVAILABILITY / OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS public.staff_availability (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    availability_status text NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- Null means all staff
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. GALLERY TABLE
CREATE TABLE IF NOT EXISTS public.gallery (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url text NOT NULL,
    storage_path text,
    caption text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON public.appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_staff_availability_date ON public.staff_availability(date);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =========================================================================
-- TRIGGERS AND SYSTEM FUNCTIONS
-- =========================================================================

-- Trigger to sync auth.users with public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role, active, speciality, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'staff'),
    true,
    COALESCE(new.raw_user_meta_data->>'speciality', 'Professional Barber'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    speciality = EXCLUDED.speciality,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to automatically create a notification on new appointments
CREATE OR REPLACE FUNCTION public.handle_new_appointment_notification()
RETURNS trigger AS $$
DECLARE
  v_service_name text;
  v_barber_name text;
BEGIN
  -- Get service name
  SELECT name INTO v_service_name FROM public.services WHERE id = new.service_id;
  
  -- Get barber name if assigned
  IF new.barber_id IS NOT NULL THEN
    SELECT name INTO v_barber_name FROM public.profiles WHERE id = new.barber_id;
  ELSE
    v_barber_name := 'Any Available Barber';
  END IF;

  -- Create notification for all staff members (recipient_id IS NULL)
  INSERT INTO public.notifications (appointment_id, title, message, read)
  VALUES (
    new.id,
    'NEW APPOINTMENT',
    COALESCE(new.customer_name, 'Client') || ' booked ' || COALESCE(v_service_name, 'Service') || ' for ' || to_char(new.appointment_date, 'YYYY-MM-DD') || ' at ' || to_char(new.start_time, 'HH24:MI') || '. Preferred Barber: ' || COALESCE(v_barber_name, 'None'),
    false
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_appointment_notification();

-- =========================================================================
-- SECURE TRANSACTION-LEVEL BUSINESS RPC FUNCTIONS
-- =========================================================================

-- RPC: Verify slot and securely book an appointment (prevents double-booking)
CREATE OR REPLACE FUNCTION public.create_appointment_secure(
  p_customer_name text,
  p_customer_phone text,
  p_service_id uuid,
  p_barber_id uuid, -- Can be null
  p_appointment_date date,
  p_start_time time without time zone,
  p_notes text
)
RETURNS jsonb AS $$
DECLARE
  v_duration_min integer;
  v_price numeric;
  v_end_time time without time zone;
  v_day_of_week integer;
  v_shop_open time without time zone;
  v_shop_close time without time zone;
  v_shop_closed boolean;
  v_ref text;
  v_appointed_id uuid;
  v_is_available boolean := false;
  v_barber_candidate uuid;
  v_settings_booking_enabled boolean;
BEGIN
  -- 1. Verify if bookings are enabled
  SELECT booking_enabled INTO v_settings_booking_enabled FROM public.business_settings WHERE id = 1;
  IF NOT COALESCE(v_settings_booking_enabled, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bookings are currently disabled by the shop owner.');
  END IF;

  -- 2. Fetch service details
  SELECT duration_minutes, price INTO v_duration_min, v_price FROM public.services WHERE id = p_service_id AND active = true;
  IF v_duration_min IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selected service is invalid or inactive.');
  END IF;

  -- Calculate appointment end time
  v_end_time := (p_start_time::interval + (v_duration_min || ' minutes')::interval)::time;

  -- 3. Check shop business hours
  -- Sunday is 0, Monday is 1... in Javascript, Sunday is 0. Postgres extract(dow) also returns 0 (Sunday) to 6 (Saturday).
  v_day_of_week := extract(dow from p_appointment_date)::integer;
  SELECT opening_time, closing_time, closed INTO v_shop_open, v_shop_close, v_shop_closed 
  FROM public.business_hours WHERE day_of_week = v_day_of_week;

  IF v_shop_closed = true OR v_shop_open IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'The shop is closed on the selected date.');
  END IF;

  IF p_start_time < v_shop_open OR v_end_time > v_shop_close THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selected time is outside the shop opening hours.');
  END IF;

  -- 4. Check barber availability and conflicts
  IF p_barber_id IS NOT NULL THEN
    -- Check if selected barber is active
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_barber_id AND active = true AND role IN ('owner', 'staff')) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selected barber is inactive or invalid.');
    END IF;

    -- Check if barber is marked unavailable in staff_availability
    IF EXISTS (
      SELECT 1 FROM public.staff_availability 
      WHERE staff_id = p_barber_id 
        AND date = p_appointment_date 
        AND availability_status = 'unavailable'
        AND (
          (start_time, end_time) OVERLAPS (p_start_time, v_end_time)
          OR (start_time <= p_start_time AND end_time >= v_end_time)
        )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selected barber is unavailable at this time.');
    END IF;

    -- Check for overlapping appointments for this specific barber
    IF EXISTS (
      SELECT 1 FROM public.appointments 
      WHERE barber_id = p_barber_id 
        AND appointment_date = p_appointment_date 
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time, end_time) OVERLAPS (p_start_time, v_end_time)
        )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selected barber already has an appointment booked at this time.');
    END IF;

    v_barber_candidate := p_barber_id;
  ELSE
    -- "Any Available Barber" selected. Find at least one active barber who is available.
    SELECT id INTO v_barber_candidate
    FROM public.profiles p
    WHERE p.active = true AND p.role IN ('owner', 'staff')
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a 
        WHERE a.barber_id = p.id 
          AND a.appointment_date = p_appointment_date 
          AND a.status NOT IN ('cancelled', 'no_show')
          AND ((a.start_time, a.end_time) OVERLAPS (p_start_time, v_end_time))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_availability sa
        WHERE sa.staff_id = p.id
          AND sa.date = p_appointment_date
          AND sa.availability_status = 'unavailable'
          AND (
            (sa.start_time, sa.end_time) OVERLAPS (p_start_time, v_end_time)
            OR (sa.start_time <= p_start_time AND sa.end_time >= v_end_time)
          )
      )
    LIMIT 1;

    IF v_barber_candidate IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No barbers are available at this time.');
    END IF;

    -- We leave barber_id as NULL to denote "unassigned", but we have verified a slot is open!
    v_barber_candidate := NULL; 
  END IF;

  -- 5. Generate Booking Reference
  LOOP
    v_ref := 'SB-' || upper(substring(md5(random()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.appointments WHERE booking_reference = v_ref);
  END LOOP;

  -- 6. Insert Appointment
  INSERT INTO public.appointments (
    booking_reference,
    customer_name,
    customer_phone,
    service_id,
    barber_id,
    appointment_date,
    start_time,
    end_time,
    booked_price,
    status,
    notes
  ) VALUES (
    v_ref,
    p_customer_name,
    p_customer_phone,
    p_service_id,
    v_barber_candidate,
    p_appointment_date,
    p_start_time,
    v_end_time,
    v_price,
    'pending',
    p_notes
  ) RETURNING id INTO v_appointed_id;

  RETURN jsonb_build_object(
    'success', true, 
    'booking_reference', v_ref, 
    'appointment_id', v_appointed_id,
    'start_time', p_start_time,
    'end_time', v_end_time,
    'price', v_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Atomic Accept Appointment (unassigned -> assigned)
CREATE OR REPLACE FUNCTION public.accept_appointment_secure(
  p_appointment_id uuid,
  p_barber_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_updated_rows integer;
BEGIN
  -- Update only if barber_id is currently NULL and barber is active
  UPDATE public.appointments 
  SET 
    barber_id = p_barber_id,
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_appointment_id 
    AND barber_id IS NULL
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_barber_id AND active = true);
    
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  
  RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Profiles:
CREATE POLICY "Public profiles reading" ON public.profiles 
    FOR SELECT USING (active = true);

CREATE POLICY "Profiles update access" ON public.profiles 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

CREATE POLICY "Profiles delete access" ON public.profiles 
    FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Services:
CREATE POLICY "Public services reading" ON public.services 
    FOR SELECT USING (active = true);

CREATE POLICY "Owner services modifications" ON public.services 
    FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Appointments:
CREATE POLICY "Staff appointments reading" ON public.appointments 
    FOR SELECT TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'staff'));

CREATE POLICY "Staff appointments update status" ON public.appointments 
    FOR UPDATE TO authenticated 
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'
        AND (barber_id = auth.uid() OR barber_id IS NULL)
      )
    );

CREATE POLICY "Owner appointments deletions" ON public.appointments 
    FOR DELETE TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Staff Availability:
CREATE POLICY "Public reading availability" ON public.staff_availability 
    FOR SELECT USING (true);

CREATE POLICY "Staff availability write own" ON public.staff_availability 
    FOR ALL TO authenticated 
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff'
        AND staff_id = auth.uid()
      )
    );

-- Business Settings:
CREATE POLICY "Public read settings" ON public.business_settings 
    FOR SELECT USING (true);

CREATE POLICY "Owner write settings" ON public.business_settings 
    FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Business Hours:
CREATE POLICY "Public read hours" ON public.business_hours 
    FOR SELECT USING (true);

CREATE POLICY "Owner write hours" ON public.business_hours 
    FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Gallery:
CREATE POLICY "Public read gallery" ON public.gallery 
    FOR SELECT USING (active = true);

CREATE POLICY "Owner write gallery" ON public.gallery 
    FOR ALL TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Notifications:
CREATE POLICY "Staff read notifications" ON public.notifications 
    FOR SELECT TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'staff'));

CREATE POLICY "Staff update own notifications" ON public.notifications 
    FOR UPDATE TO authenticated 
    USING (recipient_id = auth.uid() OR recipient_id IS NULL);

CREATE POLICY "Owner notifications clean" ON public.notifications 
    FOR DELETE TO authenticated 
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Insert default settings
INSERT INTO public.business_settings (id, shop_name, phone, whatsapp, address, map_url, instagram, booking_enabled)
VALUES (1, 'Street Barber', '+1 (555) 987-6543', '+15559876543', '404 Neon Boulevard, Sector 7', 'https://maps.google.com', 'https://instagram.com/streetbarber', true)
ON CONFLICT (id) DO NOTHING;

-- Insert weekly hours (0 = Sunday, 1 = Monday ... 6 = Saturday)
INSERT INTO public.business_hours (day_of_week, opening_time, closing_time, closed)
VALUES 
  (0, NULL, NULL, true),          -- Sunday: Closed
  (1, '09:00:00', '19:00:00', false), -- Monday
  (2, '09:00:00', '19:00:00', false), -- Tuesday
  (3, '09:00:00', '19:00:00', false), -- Wednesday
  (4, '09:00:00', '19:00:00', false), -- Thursday
  (5, '09:00:00', '20:00:00', false), -- Friday (Extended hours)
  (6, '09:00:00', '18:00:00', false)  -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

-- Insert services
INSERT INTO public.services (id, name, description, price, duration_minutes, image_url, active)
VALUES
  ('s1111111-1111-1111-1111-111111111111', 'Fresh Fade & Style', 'Precision side fade with custom styling, edge lining, hair wash, and professional style finish.', 35.00, 30, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', true),
  ('s2222222-2222-2222-2222-222222222222', 'Classic Scissor Cut', 'Traditional all-scissors haircut tailored to your head shape, including hot neck shave and hair splash.', 30.00, 30, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', true),
  ('s3333333-3333-3333-3333-333333333333', 'Beard Groom & Razor Line', 'Beard sculpting and trim, finished with a hot towel treatment, straight razor lining, and nourishing beard oil.', 25.00, 20, 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=600&q=80', true),
  ('s4444444-4444-4444-4444-444444444444', 'The Street Barber Executive', 'The ultimate combo: Signature haircut, beard trim with hot towel, black mask charcoal skin detox, and shoulder massage.', 70.00, 60, 'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&w=600&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Insert gallery items
INSERT INTO public.gallery (id, image_url, caption, active)
VALUES
  ('g1111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', 'Skin Fade with Textured Top', true),
  ('g2222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=600&q=80', 'Sharp Beard Shape & Trim', true),
  ('g3333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', 'Vibrant Salon Vibe', true),
  ('g4444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', 'Executive Hair & Beard Combo', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- CREATE DEFAULT LOGIN ACCOUNTS (FOR TESTING AND INITIAL OWNERSHIP)
-- =========================================================================

-- Insert test accounts into auth.users (linked to profiles automatically via trigger)
-- The passwords are all 'password123'
INSERT INTO auth.users (
  id, 
  instance_id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  aud, 
  role, 
  created_at, 
  updated_at
)
VALUES 
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    '00000000-0000-0000-0000-000000000000', 
    'owner@streetbarber.com', 
    extensions.crypt('password123', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Alex Owner","role":"owner","speciality":"Owner & Master Stylist","avatar_url":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}', 
    'authenticated', 
    'authenticated', 
    now(), 
    now()
  ),
  (
    'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 
    '00000000-0000-0000-0000-000000000000', 
    'barber1@streetbarber.com', 
    extensions.crypt('password123', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Marcus Sharp","role":"staff","speciality":"Fades & Beard Specialist","avatar_url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"}', 
    'authenticated', 
    'authenticated', 
    now(), 
    now()
  ),
  (
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 
    '00000000-0000-0000-0000-000000000000', 
    'barber2@streetbarber.com', 
    extensions.crypt('password123', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Leo Trim","role":"staff","speciality":"Classic Cuts & Scissors","avatar_url":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80"}', 
    'authenticated', 
    'authenticated', 
    now(), 
    now()
  )
ON CONFLICT (id) DO NOTHING;
