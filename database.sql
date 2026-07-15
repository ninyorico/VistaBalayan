-- =====================================================
-- VISTABALAYAN TEST DATA (2 Years Historical)
-- Run this in your Supabase SQL editor
-- =====================================================

-- 1. First, get your current user ID (the officer account)
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can find it by running: SELECT id, email FROM auth.users;
-- For now, let's create a variable (adjust the UUID below)
DO $$
DECLARE
    officer_id UUID := 'a71b14e7-c790-427a-b14b-0c34d4c796f9'; -- REPLACE WITH YOUR ACTUAL UUID
    beach_resort_id UUID;
    sunset_hotel_id UUID;
    paradise_inn_id UUID;
    mountain_view_id UUID;
    seaside_cafe_id UUID;
    heritage_park_id UUID;
    coastal_villa_id UUID;
    baywalk_lodge_id UUID;
BEGIN

-- =====================================================
-- 2. INSERT ESTABLISHMENTS (8 establishments)
-- =====================================================

INSERT INTO establishments (id, name, type, address, contact_number, total_rooms, status, created_at) VALUES
(gen_random_uuid(), 'Balayan Beach Resort', 'Resort', 'Brgy. Sampaga, Balayan, Batangas', '+63 917 123 4567', 25, 'active', '2024-01-15'),
(gen_random_uuid(), 'Sunset Hotel', 'Hotel', 'Brgy. Caloocan, Balayan, Batangas', '+63 917 234 5678', 18, 'active', '2024-02-10'),
(gen_random_uuid(), 'Paradise Inn', 'Inn', 'Brgy. Pagalangan, Balayan, Batangas', '+63 917 345 6789', 12, 'active', '2024-03-05'),
(gen_random_uuid(), 'Mountain View Resort', 'Resort', 'Brgy. Durungao, Balayan, Batangas', '+63 917 456 7890', 20, 'active', '2024-01-20'),
(gen_random_uuid(), 'Seaside Cafe', 'Food & Beverage Establishment', 'Brgy. Calan, Balayan, Batangas', '+63 917 567 8901', 0, 'active', '2024-04-12'),
(gen_random_uuid(), 'Balayan Heritage Park', 'Tourist Attraction', 'Brgy. Poblacion, Balayan, Batangas', '+63 917 678 9012', 0, 'active', '2024-05-18'),
(gen_random_uuid(), 'Coastal Villa Resort', 'Resort', 'Brgy. Sampaga, Balayan, Batangas', '+63 917 789 0123', 15, 'active', '2024-06-22'),
(gen_random_uuid(), 'Baywalk Lodge', 'Inn', 'Brgy. Caloocan, Balayan, Batangas', '+63 917 890 1234', 8, 'active', '2024-07-30');

-- Store establishment IDs for later use
SELECT id INTO beach_resort_id FROM establishments WHERE name = 'Balayan Beach Resort';
SELECT id INTO sunset_hotel_id FROM establishments WHERE name = 'Sunset Hotel';
SELECT id INTO paradise_inn_id FROM establishments WHERE name = 'Paradise Inn';
SELECT id INTO mountain_view_id FROM establishments WHERE name = 'Mountain View Resort';
SELECT id INTO seaside_cafe_id FROM establishments WHERE name = 'Seaside Cafe';
SELECT id INTO heritage_park_id FROM establishments WHERE name = 'Balayan Heritage Park';
SELECT id INTO coastal_villa_id FROM establishments WHERE name = 'Coastal Villa Resort';
SELECT id INTO baywalk_lodge_id FROM establishments WHERE name = 'Baywalk Lodge';

-- =====================================================
-- 3. INSERT VISITOR REPORTS (24 months of data)
-- =====================================================

-- 2024 Data
INSERT INTO visitor_reports (establishment_id, submitted_by, report_date, total_male, total_female, total_guests, residence_type, place_of_residence, status, created_at) VALUES

-- January 2024
(beach_resort_id, officer_id, '2024-01-15', 85, 95, 180, 'Batangas Resident', 'Balayan', 'approved', '2024-01-16'),
(sunset_hotel_id, officer_id, '2024-01-20', 45, 50, 95, 'Batangas Resident', 'Lipa', 'approved', '2024-01-21'),
(paradise_inn_id, officer_id, '2024-01-18', 25, 30, 55, 'Outside Batangas', 'Manila', 'approved', '2024-01-19'),
(mountain_view_id, officer_id, '2024-01-22', 40, 35, 75, 'Batangas Resident', 'Batangas City', 'approved', '2024-01-23'),
(seaside_cafe_id, officer_id, '2024-01-25', 30, 45, 75, 'Batangas Resident', 'Balayan', 'approved', '2024-01-26'),

-- February 2024
(beach_resort_id, officer_id, '2024-02-14', 90, 100, 190, 'Batangas Resident', 'Balayan', 'approved', '2024-02-15'),
(sunset_hotel_id, officer_id, '2024-02-18', 50, 55, 105, 'Outside Batangas', 'Quezon City', 'approved', '2024-02-19'),
(paradise_inn_id, officer_id, '2024-02-20', 30, 35, 65, 'Batangas Resident', 'Balayan', 'approved', '2024-02-21'),
(mountain_view_id, officer_id, '2024-02-22', 45, 40, 85, 'Foreign', 'USA', 'approved', '2024-02-23'),
(beach_resort_id, officer_id, '2024-02-28', 95, 105, 200, 'Outside Batangas', 'Manila', 'approved', '2024-02-29'),

-- March 2024 (peak season starts)
(beach_resort_id, officer_id, '2024-03-10', 110, 120, 230, 'Outside Batangas', 'Manila', 'approved', '2024-03-11'),
(sunset_hotel_id, officer_id, '2024-03-12', 60, 70, 130, 'Foreign', 'UK', 'approved', '2024-03-13'),
(paradise_inn_id, officer_id, '2024-03-15', 40, 45, 85, 'Batangas Resident', 'Balayan', 'approved', '2024-03-16'),
(mountain_view_id, officer_id, '2024-03-18', 55, 60, 115, 'Outside Batangas', 'Cavite', 'approved', '2024-03-19'),
(beach_resort_id, officer_id, '2024-03-25', 120, 130, 250, 'Foreign', 'Japan', 'approved', '2024-03-26'),
(sunset_hotel_id, officer_id, '2024-03-28', 70, 75, 145, 'Outside Batangas', 'Manila', 'approved', '2024-03-29'),

-- April 2024
(beach_resort_id, officer_id, '2024-04-05', 115, 125, 240, 'Outside Batangas', 'Manila', 'approved', '2024-04-06'),
(sunset_hotel_id, officer_id, '2024-04-08', 65, 70, 135, 'Batangas Resident', 'Lipa', 'approved', '2024-04-09'),
(paradise_inn_id, officer_id, '2024-04-12', 45, 50, 95, 'Foreign', 'Australia', 'approved', '2024-04-13'),
(mountain_view_id, officer_id, '2024-04-18', 60, 65, 125, 'Outside Batangas', 'Laguna', 'approved', '2024-04-19'),
(beach_resort_id, officer_id, '2024-04-22', 125, 135, 260, 'Batangas Resident', 'Balayan', 'approved', '2024-04-23'),
(coastal_villa_id, officer_id, '2024-04-25', 35, 40, 75, 'Outside Batangas', 'Manila', 'approved', '2024-04-26'),

-- May 2024 (peak season)
(beach_resort_id, officer_id, '2024-05-01', 140, 150, 290, 'Foreign', 'Korea', 'approved', '2024-05-02'),
(sunset_hotel_id, officer_id, '2024-05-05', 80, 85, 165, 'Outside Batangas', 'Manila', 'approved', '2024-05-06'),
(beach_resort_id, officer_id, '2024-05-10', 155, 165, 320, 'Batangas Resident', 'Balayan', 'approved', '2024-05-11'),
(paradise_inn_id, officer_id, '2024-05-15', 55, 60, 115, 'Foreign', 'China', 'approved', '2024-05-16'),
(mountain_view_id, officer_id, '2024-05-20', 75, 80, 155, 'Outside Batangas', 'Quezon City', 'approved', '2024-05-21'),
(sunset_hotel_id, officer_id, '2024-05-25', 85, 90, 175, 'Outside Batangas', 'Cebu', 'approved', '2024-05-26'),
(beach_resort_id, officer_id, '2024-05-30', 160, 170, 330, 'Foreign', 'USA', 'approved', '2024-05-31'),

-- June 2024
(beach_resort_id, officer_id, '2024-06-05', 135, 145, 280, 'Outside Batangas', 'Manila', 'approved', '2024-06-06'),
(sunset_hotel_id, officer_id, '2024-06-10', 75, 80, 155, 'Batangas Resident', 'Balayan', 'approved', '2024-06-11'),
(beach_resort_id, officer_id, '2024-06-15', 130, 140, 270, 'Foreign', 'Canada', 'approved', '2024-06-16'),
(paradise_inn_id, officer_id, '2024-06-20', 50, 55, 105, 'Outside Batangas', 'Bulacan', 'approved', '2024-06-21'),
(mountain_view_id, officer_id, '2024-06-25', 65, 70, 135, 'Batangas Resident', 'Lipa', 'approved', '2024-06-26'),

-- July 2024
(beach_resort_id, officer_id, '2024-07-08', 120, 130, 250, 'Outside Batangas', 'Manila', 'approved', '2024-07-09'),
(sunset_hotel_id, officer_id, '2024-07-12', 70, 75, 145, 'Foreign', 'Germany', 'approved', '2024-07-13'),
(beach_resort_id, officer_id, '2024-07-18', 125, 135, 260, 'Batangas Resident', 'Balayan', 'approved', '2024-07-19'),
(paradise_inn_id, officer_id, '2024-07-22', 45, 50, 95, 'Outside Batangas', 'Rizal', 'approved', '2024-07-23'),
(coastal_villa_id, officer_id, '2024-07-28', 40, 45, 85, 'Batangas Resident', 'Batangas City', 'approved', '2024-07-29'),

-- August 2024
(beach_resort_id, officer_id, '2024-08-05', 115, 125, 240, 'Batangas Resident', 'Balayan', 'approved', '2024-08-06'),
(sunset_hotel_id, officer_id, '2024-08-10', 65, 70, 135, 'Outside Batangas', 'Manila', 'approved', '2024-08-11'),
(beach_resort_id, officer_id, '2024-08-15', 110, 120, 230, 'Foreign', 'Singapore', 'approved', '2024-08-16'),
(mountain_view_id, officer_id, '2024-08-20', 55, 60, 115, 'Outside Batangas', 'Pampanga', 'approved', '2024-08-21'),
(paradise_inn_id, officer_id, '2024-08-25', 40, 45, 85, 'Batangas Resident', 'Balayan', 'approved', '2024-08-26'),

-- September 2024
(beach_resort_id, officer_id, '2024-09-05', 100, 110, 210, 'Outside Batangas', 'Manila', 'approved', '2024-09-06'),
(sunset_hotel_id, officer_id, '2024-09-10', 55, 60, 115, 'Batangas Resident', 'Lipa', 'approved', '2024-09-11'),
(beach_resort_id, officer_id, '2024-09-15', 95, 105, 200, 'Foreign', 'France', 'approved', '2024-09-16'),
(mountain_view_id, officer_id, '2024-09-20', 50, 55, 105, 'Outside Batangas', 'Cavite', 'approved', '2024-09-21'),
(baywalk_lodge_id, officer_id, '2024-09-25', 30, 35, 65, 'Batangas Resident', 'Balayan', 'approved', '2024-09-26'),

-- October 2024
(beach_resort_id, officer_id, '2024-10-05', 95, 105, 200, 'Batangas Resident', 'Balayan', 'approved', '2024-10-06'),
(sunset_hotel_id, officer_id, '2024-10-10', 50, 55, 105, 'Outside Batangas', 'Manila', 'approved', '2024-10-11'),
(beach_resort_id, officer_id, '2024-10-15', 100, 110, 210, 'Foreign', 'Italy', 'approved', '2024-10-16'),
(paradise_inn_id, officer_id, '2024-10-20', 35, 40, 75, 'Outside Batangas', 'Laguna', 'approved', '2024-10-21'),
(coastal_villa_id, officer_id, '2024-10-25', 35, 40, 75, 'Batangas Resident', 'Batangas City', 'approved', '2024-10-26'),

-- November 2024
(beach_resort_id, officer_id, '2024-11-05', 90, 100, 190, 'Outside Batangas', 'Manila', 'approved', '2024-11-06'),
(sunset_hotel_id, officer_id, '2024-11-10', 45, 50, 95, 'Batangas Resident', 'Balayan', 'approved', '2024-11-11'),
(beach_resort_id, officer_id, '2024-11-15', 85, 95, 180, 'Foreign', 'Spain', 'approved', '2024-11-16'),
(mountain_view_id, officer_id, '2024-11-20', 45, 50, 95, 'Outside Batangas', 'Quezon City', 'approved', '2024-11-21'),

-- December 2024 (holiday season)
(beach_resort_id, officer_id, '2024-12-15', 130, 140, 270, 'Outside Batangas', 'Manila', 'approved', '2024-12-16'),
(sunset_hotel_id, officer_id, '2024-12-18', 75, 80, 155, 'Foreign', 'USA', 'approved', '2024-12-19'),
(beach_resort_id, officer_id, '2024-12-22', 145, 155, 300, 'Batangas Resident', 'Balayan', 'approved', '2024-12-23'),
(paradise_inn_id, officer_id, '2024-12-26', 50, 55, 105, 'Outside Batangas', 'Cavite', 'approved', '2024-12-27'),
(mountain_view_id, officer_id, '2024-12-28', 60, 65, 125, 'Foreign', 'Australia', 'approved', '2024-12-29'),
(sunset_hotel_id, officer_id, '2024-12-30', 80, 85, 165, 'Outside Batangas', 'Manila', 'approved', '2024-12-31'),

-- =====================================================
-- 2025 Data (continuing the trend with growth)
-- =====================================================

-- January 2025
(beach_resort_id, officer_id, '2025-01-10', 100, 110, 210, 'Batangas Resident', 'Balayan', 'approved', '2025-01-11'),
(sunset_hotel_id, officer_id, '2025-01-15', 55, 60, 115, 'Outside Batangas', 'Manila', 'approved', '2025-01-16'),
(beach_resort_id, officer_id, '2025-01-20', 105, 115, 220, 'Foreign', 'Japan', 'approved', '2025-01-21'),
(paradise_inn_id, officer_id, '2025-01-25', 35, 40, 75, 'Batangas Resident', 'Balayan', 'approved', '2025-01-26'),
(mountain_view_id, officer_id, '2025-01-28', 50, 55, 105, 'Outside Batangas', 'Laguna', 'approved', '2025-01-29'),

-- February 2025
(beach_resort_id, officer_id, '2025-02-08', 105, 115, 220, 'Outside Batangas', 'Manila', 'approved', '2025-02-09'),
(sunset_hotel_id, officer_id, '2025-02-12', 60, 65, 125, 'Batangas Resident', 'Lipa', 'approved', '2025-02-13'),
(beach_resort_id, officer_id, '2025-02-18', 110, 120, 230, 'Foreign', 'Korea', 'approved', '2025-02-19'),
(paradise_inn_id, officer_id, '2025-02-22', 40, 45, 85, 'Outside Batangas', 'Quezon City', 'approved', '2025-02-23'),
(coastal_villa_id, officer_id, '2025-02-25', 40, 45, 85, 'Batangas Resident', 'Batangas City', 'approved', '2025-02-26'),

-- March 2025
(beach_resort_id, officer_id, '2025-03-05', 130, 140, 270, 'Outside Batangas', 'Manila', 'approved', '2025-03-06'),
(sunset_hotel_id, officer_id, '2025-03-08', 70, 75, 145, 'Foreign', 'UK', 'approved', '2025-03-09'),
(beach_resort_id, officer_id, '2025-03-12', 140, 150, 290, 'Batangas Resident', 'Balayan', 'approved', '2025-03-13'),
(paradise_inn_id, officer_id, '2025-03-15', 50, 55, 105, 'Outside Batangas', 'Cavite', 'approved', '2025-03-16'),
(mountain_view_id, officer_id, '2025-03-18', 65, 70, 135, 'Foreign', 'Canada', 'approved', '2025-03-19'),
(sunset_hotel_id, officer_id, '2025-03-22', 75, 80, 155, 'Outside Batangas', 'Manila', 'approved', '2025-03-23'),
(beach_resort_id, officer_id, '2025-03-28', 150, 160, 310, 'Foreign', 'USA', 'approved', '2025-03-29'),

-- April 2025
(beach_resort_id, officer_id, '2025-04-05', 135, 145, 280, 'Batangas Resident', 'Balayan', 'approved', '2025-04-06'),
(sunset_hotel_id, officer_id, '2025-04-08', 75, 80, 155, 'Outside Batangas', 'Manila', 'approved', '2025-04-09'),
(beach_resort_id, officer_id, '2025-04-12', 145, 155, 300, 'Foreign', 'Germany', 'approved', '2025-04-13'),
(paradise_inn_id, officer_id, '2025-04-15', 55, 60, 115, 'Batangas Resident', 'Balayan', 'approved', '2025-04-16'),
(mountain_view_id, officer_id, '2025-04-18', 70, 75, 145, 'Outside Batangas', 'Bulacan', 'approved', '2025-04-19'),
(beach_resort_id, officer_id, '2025-04-25', 150, 160, 310, 'Outside Batangas', 'Manila', 'approved', '2025-04-26'),

-- May 2025 (peak season)
(beach_resort_id, officer_id, '2025-05-01', 165, 175, 340, 'Foreign', 'China', 'approved', '2025-05-02'),
(sunset_hotel_id, officer_id, '2025-05-05', 90, 95, 185, 'Outside Batangas', 'Manila', 'approved', '2025-05-06'),
(beach_resort_id, officer_id, '2025-05-08', 175, 185, 360, 'Batangas Resident', 'Balayan', 'approved', '2025-05-09'),
(paradise_inn_id, officer_id, '2025-05-12', 65, 70, 135, 'Foreign', 'Australia', 'approved', '2025-05-13'),
(mountain_view_id, officer_id, '2025-05-15', 85, 90, 175, 'Outside Batangas', 'Quezon City', 'approved', '2025-05-16'),
(sunset_hotel_id, officer_id, '2025-05-18', 95, 100, 195, 'Foreign', 'Singapore', 'approved', '2025-05-19'),
(beach_resort_id, officer_id, '2025-05-22', 180, 190, 370, 'Outside Batangas', 'Manila', 'approved', '2025-05-23'),
(coastal_villa_id, officer_id, '2025-05-25', 55, 60, 115, 'Batangas Resident', 'Balayan', 'approved', '2025-05-26'),
(beach_resort_id, officer_id, '2025-05-30', 170, 180, 350, 'Foreign', 'USA', 'approved', '2025-05-31'),

-- June 2025
(beach_resort_id, officer_id, '2025-06-05', 150, 160, 310, 'Outside Batangas', 'Manila', 'approved', '2025-06-06'),
(sunset_hotel_id, officer_id, '2025-06-10', 85, 90, 175, 'Batangas Resident', 'Lipa', 'approved', '2025-06-11'),
(beach_resort_id, officer_id, '2025-06-15', 145, 155, 300, 'Foreign', 'Japan', 'approved', '2025-06-16'),
(paradise_inn_id, officer_id, '2025-06-20', 60, 65, 125, 'Outside Batangas', 'Cavite', 'approved', '2025-06-21'),
(mountain_view_id, officer_id, '2025-06-25', 75, 80, 155, 'Batangas Resident', 'Balayan', 'approved', '2025-06-26'),

-- July 2025
(beach_resort_id, officer_id, '2025-07-05', 135, 145, 280, 'Outside Batangas', 'Manila', 'approved', '2025-07-06'),
(sunset_hotel_id, officer_id, '2025-07-10', 80, 85, 165, 'Foreign', 'France', 'approved', '2025-07-11'),
(beach_resort_id, officer_id, '2025-07-15', 140, 150, 290, 'Batangas Resident', 'Balayan', 'approved', '2025-07-16'),
(paradise_inn_id, officer_id, '2025-07-20', 55, 60, 115, 'Outside Batangas', 'Laguna', 'approved', '2025-07-21'),
(baywalk_lodge_id, officer_id, '2025-07-25', 40, 45, 85, 'Batangas Resident', 'Balayan', 'approved', '2025-07-26'),

-- August 2025
(beach_resort_id, officer_id, '2025-08-05', 125, 135, 260, 'Batangas Resident', 'Balayan', 'approved', '2025-08-06'),
(sunset_hotel_id, officer_id, '2025-08-10', 75, 80, 155, 'Outside Batangas', 'Manila', 'approved', '2025-08-11'),
(beach_resort_id, officer_id, '2025-08-15', 120, 130, 250, 'Foreign', 'Italy', 'approved', '2025-08-16'),
(mountain_view_id, officer_id, '2025-08-20', 65, 70, 135, 'Outside Batangas', 'Pampanga', 'approved', '2025-08-21'),
(paradise_inn_id, officer_id, '2025-08-25', 50, 55, 105, 'Batangas Resident', 'Balayan', 'approved', '2025-08-26'),

-- September 2025
(beach_resort_id, officer_id, '2025-09-05', 115, 125, 240, 'Outside Batangas', 'Manila', 'approved', '2025-09-06'),
(sunset_hotel_id, officer_id, '2025-09-10', 65, 70, 135, 'Batangas Resident', 'Lipa', 'approved', '2025-09-11'),
(beach_resort_id, officer_id, '2025-09-15', 110, 120, 230, 'Foreign', 'Spain', 'approved', '2025-09-16'),
(mountain_view_id, officer_id, '2025-09-20', 60, 65, 125, 'Outside Batangas', 'Quezon City', 'approved', '2025-09-21'),
(coastal_villa_id, officer_id, '2025-09-25', 45, 50, 95, 'Batangas Resident', 'Batangas City', 'approved', '2025-09-26'),

-- October 2025
(beach_resort_id, officer_id, '2025-10-05', 110, 120, 230, 'Batangas Resident', 'Balayan', 'approved', '2025-10-06'),
(sunset_hotel_id, officer_id, '2025-10-10', 60, 65, 125, 'Outside Batangas', 'Manila', 'approved', '2025-10-11'),
(beach_resort_id, officer_id, '2025-10-15', 115, 125, 240, 'Foreign', 'Netherlands', 'approved', '2025-10-16'),
(paradise_inn_id, officer_id, '2025-10-20', 45, 50, 95, 'Outside Batangas', 'Cavite', 'approved', '2025-10-21'),
(mountain_view_id, officer_id, '2025-10-25', 55, 60, 115, 'Batangas Resident', 'Balayan', 'approved', '2025-10-26'),

-- November 2025
(beach_resort_id, officer_id, '2025-11-05', 105, 115, 220, 'Outside Batangas', 'Manila', 'approved', '2025-11-06'),
(sunset_hotel_id, officer_id, '2025-11-10', 55, 60, 115, 'Batangas Resident', 'Balayan', 'approved', '2025-11-11'),
(beach_resort_id, officer_id, '2025-11-15', 100, 110, 210, 'Foreign', 'Sweden', 'approved', '2025-11-16'),
(paradise_inn_id, officer_id, '2025-11-20', 40, 45, 85, 'Outside Batangas', 'Laguna', 'approved', '2025-11-21'),
(baywalk_lodge_id, officer_id, '2025-11-25', 35, 40, 75, 'Batangas Resident', 'Balayan', 'approved', '2025-11-26'),

-- December 2025 (holiday season)
(beach_resort_id, officer_id, '2025-12-10', 150, 160, 310, 'Outside Batangas', 'Manila', 'approved', '2025-12-11'),
(sunset_hotel_id, officer_id, '2025-12-15', 85, 90, 175, 'Foreign', 'USA', 'approved', '2025-12-16'),
(beach_resort_id, officer_id, '2025-12-18', 160, 170, 330, 'Batangas Resident', 'Balayan', 'approved', '2025-12-19'),
(paradise_inn_id, officer_id, '2025-12-22', 60, 65, 125, 'Outside Batangas', 'Quezon City', 'approved', '2025-12-23'),
(mountain_view_id, officer_id, '2025-12-26', 70, 75, 145, 'Foreign', 'Australia', 'approved', '2025-12-27'),
(sunset_hotel_id, officer_id, '2025-12-30', 90, 95, 185, 'Outside Batangas', 'Manila', 'approved', '2025-12-31'),

-- January 2026 (current year, partial data)
(beach_resort_id, officer_id, '2026-01-10', 110, 120, 230, 'Outside Batangas', 'Manila', 'approved', '2026-01-11'),
(sunset_hotel_id, officer_id, '2026-01-15', 60, 65, 125, 'Batangas Resident', 'Lipa', 'approved', '2026-01-16'),
(beach_resort_id, officer_id, '2026-01-20', 115, 125, 240, 'Foreign', 'Japan', 'approved', '2026-01-21'),
(paradise_inn_id, officer_id, '2026-01-25', 40, 45, 85, 'Outside Batangas', 'Cavite', 'approved', '2026-01-26'),

-- February 2026
(beach_resort_id, officer_id, '2026-02-08', 115, 125, 240, 'Batangas Resident', 'Balayan', 'approved', '2026-02-09'),
(sunset_hotel_id, officer_id, '2026-02-12', 65, 70, 135, 'Outside Batangas', 'Manila', 'approved', '2026-02-13'),
(beach_resort_id, officer_id, '2026-02-18', 120, 130, 250, 'Foreign', 'Korea', 'approved', '2026-02-19'),
(mountain_view_id, officer_id, '2026-02-22', 55, 60, 115, 'Batangas Resident', 'Balayan', 'approved', '2026-02-23'),

-- March 2026
(beach_resort_id, officer_id, '2026-03-05', 140, 150, 290, 'Outside Batangas', 'Manila', 'approved', '2026-03-06'),
(sunset_hotel_id, officer_id, '2026-03-08', 75, 80, 155, 'Foreign', 'UK', 'approved', '2026-03-09'),
(beach_resort_id, officer_id, '2026-03-12', 150, 160, 310, 'Batangas Resident', 'Balayan', 'approved', '2026-03-13'),
(paradise_inn_id, officer_id, '2026-03-15', 55, 60, 115, 'Outside Batangas', 'Bulacan', 'approved', '2026-03-16'),
(mountain_view_id, officer_id, '2026-03-18', 70, 75, 145, 'Foreign', 'Canada', 'approved', '2026-03-19'),
(beach_resort_id, officer_id, '2026-03-25', 155, 165, 320, 'Outside Batangas', 'Manila', 'approved', '2026-03-26'),

-- April 2026
(beach_resort_id, officer_id, '2026-04-05', 145, 155, 300, 'Batangas Resident', 'Balayan', 'approved', '2026-04-06'),
(sunset_hotel_id, officer_id, '2026-04-08', 80, 85, 165, 'Outside Batangas', 'Manila', 'approved', '2026-04-09'),
(beach_resort_id, officer_id, '2026-04-12', 150, 160, 310, 'Foreign', 'Germany', 'approved', '2026-04-13'),
(paradise_inn_id, officer_id, '2026-04-15', 60, 65, 125, 'Batangas Resident', 'Balayan', 'approved', '2026-04-16'),
(mountain_view_id, officer_id, '2026-04-18', 75, 80, 155, 'Outside Batangas', 'Laguna', 'approved', '2026-04-19'),
(coastal_villa_id, officer_id, '2026-04-22', 50, 55, 105, 'Foreign', 'USA', 'approved', '2026-04-23');

-- =====================================================
-- 4. INSERT ACCOMMODATION REPORTS (Monthly data for resorts/hotels)
-- =====================================================

-- Balayan Beach Resort (25 rooms)
INSERT INTO accommodation_reports (establishment_id, submitted_by, report_date, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights, status, created_at) VALUES
(beach_resort_id, officer_id, '2024-01-31', 25, 18, 145, 520, 'approved', '2024-01-31'),
(beach_resort_id, officer_id, '2024-02-29', 25, 19, 160, 580, 'approved', '2024-02-29'),
(beach_resort_id, officer_id, '2024-03-31', 25, 22, 195, 700, 'approved', '2024-03-31'),
(beach_resort_id, officer_id, '2024-04-30', 25, 23, 210, 760, 'approved', '2024-04-30'),
(beach_resort_id, officer_id, '2024-05-31', 25, 24, 245, 880, 'approved', '2024-05-31'),
(beach_resort_id, officer_id, '2024-06-30', 25, 22, 210, 760, 'approved', '2024-06-30'),
(beach_resort_id, officer_id, '2024-07-31', 25, 21, 195, 700, 'approved', '2024-07-31'),
(beach_resort_id, officer_id, '2024-08-31', 25, 20, 180, 650, 'approved', '2024-08-31'),
(beach_resort_id, officer_id, '2024-09-30', 25, 18, 155, 560, 'approved', '2024-09-30'),
(beach_resort_id, officer_id, '2024-10-31', 25, 17, 150, 540, 'approved', '2024-10-31'),
(beach_resort_id, officer_id, '2024-11-30', 25, 16, 140, 500, 'approved', '2024-11-30'),
(beach_resort_id, officer_id, '2024-12-31', 25, 23, 220, 790, 'approved', '2024-12-31'),
(beach_resort_id, officer_id, '2025-01-31', 25, 18, 165, 590, 'approved', '2025-01-31'),
(beach_resort_id, officer_id, '2025-02-28', 25, 20, 175, 630, 'approved', '2025-02-28'),
(beach_resort_id, officer_id, '2025-03-31', 25, 23, 215, 770, 'approved', '2025-03-31'),
(beach_resort_id, officer_id, '2025-04-30', 25, 24, 235, 850, 'approved', '2025-04-30'),
(beach_resort_id, officer_id, '2025-05-31', 25, 24, 265, 950, 'approved', '2025-05-31'),
(beach_resort_id, officer_id, '2025-06-30', 25, 22, 225, 810, 'approved', '2025-06-30'),
(beach_resort_id, officer_id, '2025-07-31', 25, 21, 210, 760, 'approved', '2025-07-31'),
(beach_resort_id, officer_id, '2025-08-31', 25, 20, 195, 700, 'approved', '2025-08-31'),
(beach_resort_id, officer_id, '2025-09-30', 25, 18, 170, 610, 'approved', '2025-09-30'),
(beach_resort_id, officer_id, '2025-10-31', 25, 18, 165, 590, 'approved', '2025-10-31'),
(beach_resort_id, officer_id, '2025-11-30', 25, 17, 155, 560, 'approved', '2025-11-30'),
(beach_resort_id, officer_id, '2025-12-31', 25, 23, 235, 850, 'approved', '2025-12-31'),
(beach_resort_id, officer_id, '2026-01-31', 25, 18, 170, 610, 'approved', '2026-01-31'),
(beach_resort_id, officer_id, '2026-02-28', 25, 20, 180, 650, 'approved', '2026-02-28'),
(beach_resort_id, officer_id, '2026-03-31', 25, 23, 220, 790, 'approved', '2026-03-31'),
(beach_resort_id, officer_id, '2026-04-30', 25, 24, 240, 860, 'approved', '2026-04-30');

-- Sunset Hotel (18 rooms)
INSERT INTO accommodation_reports (establishment_id, submitted_by, report_date, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights, status, created_at) VALUES
(sunset_hotel_id, officer_id, '2024-01-31', 18, 12, 95, 340, 'approved', '2024-01-31'),
(sunset_hotel_id, officer_id, '2024-02-29', 18, 13, 105, 380, 'approved', '2024-02-29'),
(sunset_hotel_id, officer_id, '2024-03-31', 18, 15, 125, 450, 'approved', '2024-03-31'),
(sunset_hotel_id, officer_id, '2024-04-30', 18, 15, 130, 470, 'approved', '2024-04-30'),
(sunset_hotel_id, officer_id, '2024-05-31', 18, 16, 150, 540, 'approved', '2024-05-31'),
(sunset_hotel_id, officer_id, '2024-06-30', 18, 14, 125, 450, 'approved', '2024-06-30'),
(sunset_hotel_id, officer_id, '2024-07-31', 18, 13, 115, 410, 'approved', '2024-07-31'),
(sunset_hotel_id, officer_id, '2024-08-31', 18, 12, 105, 380, 'approved', '2024-08-31'),
(sunset_hotel_id, officer_id, '2024-09-30', 18, 11, 95, 340, 'approved', '2024-09-30'),
(sunset_hotel_id, officer_id, '2024-10-31', 18, 10, 90, 320, 'approved', '2024-10-31'),
(sunset_hotel_id, officer_id, '2024-11-30', 18, 10, 85, 310, 'approved', '2024-11-30'),
(sunset_hotel_id, officer_id, '2024-12-31', 18, 15, 135, 490, 'approved', '2024-12-31'),
(sunset_hotel_id, officer_id, '2025-01-31', 18, 12, 105, 380, 'approved', '2025-01-31'),
(sunset_hotel_id, officer_id, '2025-02-28', 18, 13, 110, 400, 'approved', '2025-02-28'),
(sunset_hotel_id, officer_id, '2025-03-31', 18, 15, 135, 490, 'approved', '2025-03-31'),
(sunset_hotel_id, officer_id, '2025-04-30', 18, 16, 145, 520, 'approved', '2025-04-30'),
(sunset_hotel_id, officer_id, '2025-05-31', 18, 16, 160, 580, 'approved', '2025-05-31'),
(sunset_hotel_id, officer_id, '2025-06-30', 18, 14, 135, 490, 'approved', '2025-06-30'),
(sunset_hotel_id, officer_id, '2025-07-31', 18, 13, 125, 450, 'approved', '2025-07-31'),
(sunset_hotel_id, officer_id, '2025-08-31', 18, 12, 115, 410, 'approved', '2025-08-31'),
(sunset_hotel_id, officer_id, '2025-09-30', 18, 11, 105, 380, 'approved', '2025-09-30'),
(sunset_hotel_id, officer_id, '2025-10-31', 18, 11, 100, 360, 'approved', '2025-10-31'),
(sunset_hotel_id, officer_id, '2025-11-30', 18, 10, 95, 340, 'approved', '2025-11-30'),
(sunset_hotel_id, officer_id, '2025-12-31', 18, 15, 145, 520, 'approved', '2025-12-31'),
(sunset_hotel_id, officer_id, '2026-01-31', 18, 12, 110, 400, 'approved', '2026-01-31'),
(sunset_hotel_id, officer_id, '2026-02-28', 18, 13, 115, 410, 'approved', '2026-02-28'),
(sunset_hotel_id, officer_id, '2026-03-31', 18, 15, 140, 500, 'approved', '2026-03-31'),
(sunset_hotel_id, officer_id, '2026-04-30', 18, 16, 150, 540, 'approved', '2026-04-30');

-- Mountain View Resort (20 rooms)
INSERT INTO accommodation_reports (establishment_id, submitted_by, report_date, total_rooms, total_occupied_rooms, total_check_ins, total_guest_nights, status, created_at) VALUES
(mountain_view_id, officer_id, '2024-01-31', 20, 10, 75, 270, 'approved', '2024-01-31'),
(mountain_view_id, officer_id, '2024-02-29', 20, 11, 85, 310, 'approved', '2024-02-29'),
(mountain_view_id, officer_id, '2024-03-31', 20, 13, 105, 380, 'approved', '2024-03-31'),
(mountain_view_id, officer_id, '2024-04-30', 20, 13, 110, 400, 'approved', '2024-04-30'),
(mountain_view_id, officer_id, '2024-05-31', 20, 14, 125, 450, 'approved', '2024-05-31'),
(mountain_view_id, officer_id, '2024-06-30', 20, 12, 105, 380, 'approved', '2024-06-30'),
(mountain_view_id, officer_id, '2024-07-31', 20, 11, 95, 340, 'approved', '2024-07-31'),
(mountain_view_id, officer_id, '2024-08-31', 20, 10, 85, 310, 'approved', '2024-08-31'),
(mountain_view_id, officer_id, '2024-09-30', 20, 9, 75, 270, 'approved', '2024-09-30'),
(mountain_view_id, officer_id, '2024-10-31', 20, 9, 70, 250, 'approved', '2024-10-31'),
(mountain_view_id, officer_id, '2024-11-30', 20, 8, 65, 230, 'approved', '2024-11-30'),
(mountain_view_id, officer_id, '2024-12-31', 20, 13, 115, 410, 'approved', '2024-12-31'),
(mountain_view_id, officer_id, '2025-01-31', 20, 10, 85, 310, 'approved', '2025-01-31'),
(mountain_view_id, officer_id, '2025-02-28', 20, 11, 90, 330, 'approved', '2025-02-28'),
(mountain_view_id, officer_id, '2025-03-31', 20, 13, 115, 410, 'approved', '2025-03-31'),
(mountain_view_id, officer_id, '2025-04-30', 20, 14, 125, 450, 'approved', '2025-04-30'),
(mountain_view_id, officer_id, '2025-05-31', 20, 15, 140, 500, 'approved', '2025-05-31'),
(mountain_view_id, officer_id, '2025-06-30', 20, 12, 115, 410, 'approved', '2025-06-30'),
(mountain_view_id, officer_id, '2025-07-31', 20, 11, 105, 380, 'approved', '2025-07-31'),
(mountain_view_id, officer_id, '2025-08-31', 20, 10, 95, 340, 'approved', '2025-08-31'),
(mountain_view_id, officer_id, '2025-09-30', 20, 9, 85, 310, 'approved', '2025-09-30'),
(mountain_view_id, officer_id, '2025-10-31', 20, 9, 80, 290, 'approved', '2025-10-31'),
(mountain_view_id, officer_id, '2025-11-30', 20, 8, 75, 270, 'approved', '2025-11-30'),
(mountain_view_id, officer_id, '2025-12-31', 20, 13, 125, 450, 'approved', '2025-12-31'),
(mountain_view_id, officer_id, '2026-01-31', 20, 10, 90, 330, 'approved', '2026-01-31'),
(mountain_view_id, officer_id, '2026-02-28', 20, 11, 95, 340, 'approved', '2026-02-28'),
(mountain_view_id, officer_id, '2026-03-31', 20, 13, 120, 430, 'approved', '2026-03-31'),
(mountain_view_id, officer_id, '2026-04-30', 20, 14, 130, 470, 'approved', '2026-04-30');

-- =====================================================
-- 5. INSERT SAMPLE AI ANOMALIES
-- =====================================================

INSERT INTO ai_anomalies (id, type, severity, description, establishment_id, detected_at, status, recommendation) VALUES
(gen_random_uuid(), 'Unusual Drop', 'medium', '65% decrease in visitors at Paradise Inn during peak season', paradise_inn_id, '2025-05-15 10:30:00', 'active', 'Investigate potential operational issues or marketing gaps'),
(gen_random_uuid(), 'Data Quality Issue', 'low', 'Guest check-ins and guest nights mismatch detected on May 5', beach_resort_id, '2025-05-07 14:20:00', 'active', 'Review and correct the accommodation report for May 5'),
(gen_random_uuid(), 'Unusual Pattern', 'medium', 'Weekend occupancy lower than expected for this season', sunset_hotel_id, '2025-03-10 09:15:00', 'active', 'Consider promotional activities for upcoming weekends'),
(gen_random_uuid(), 'Occupancy Drop', 'high', 'Mountain View Resort occupancy dropped 30% in Q3 2025', mountain_view_id, '2025-10-01 11:00:00', 'active', 'Review pricing strategy and local competition'),
(gen_random_uuid(), 'Anomaly Detected', 'low', 'Unusual spike in foreign visitors during off-peak month', beach_resort_id, '2025-08-20 16:45:00', 'active', 'Verify data accuracy and investigate potential group bookings'),
(gen_random_uuid(), 'Data Anomaly', 'medium', 'Duplicate visitor entries detected for same date', paradise_inn_id, '2025-11-05 13:30:00', 'active', 'Check for duplicate submissions and clean up data');

-- =====================================================
-- 6. INSERT SAMPLE NOTIFICATIONS
-- =====================================================

INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
(gen_random_uuid(), officer_id, 'New Establishment Registered', 'Balayan Heritage Park has been added to the system', 'info', false, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), officer_id, 'Monthly Report Available', 'April 2026 consolidated tourism report is ready for export', 'success', false, NOW() - INTERVAL '5 days'),
(gen_random_uuid(), officer_id, 'Pending Review', '2 new establishment reports awaiting your review', 'warning', false, NOW() - INTERVAL '1 day'),
(gen_random_uuid(), officer_id, 'AI Alert', 'Unusual visitor pattern detected at Balayan Beach Resort', 'alert', false, NOW() - INTERVAL '3 days');

-- =====================================================
-- 7. VERIFICATION QUERIES (Run these to check data)
-- =====================================================

-- Check counts
SELECT 'Establishments' as TableName, COUNT(*) as Count FROM establishments
UNION ALL
SELECT 'Visitor Reports', COUNT(*) FROM visitor_reports
UNION ALL
SELECT 'Accommodation Reports', COUNT(*) FROM accommodation_reports
UNION ALL
SELECT 'AI Anomalies', COUNT(*) FROM ai_anomalies
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications;

-- Show summary
SELECT 
    DATE_TRUNC('month', report_date) as month,
    COUNT(*) as report_count,
    SUM(total_guests) as total_visitors
FROM visitor_reports
GROUP BY DATE_TRUNC('month', report_date)
ORDER BY month DESC
LIMIT 12;

END $$;