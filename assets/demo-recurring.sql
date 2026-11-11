-- Odemes demo: recurring transactions
-- Run in Supabase -> SQL Editor while logged-in user owns the rows.
-- Replace the email below with the demo account's email.

with u as (select id from auth.users where email = 'clydesemedo@gmail.com')
insert into recurring_transactions
  (user_id, type, amount, category, note, frequency, next_due_date, currency, is_active)
values
  ((select id from u), 'expense', 1450, 'Rent', 'Apartment', 'monthly', '2026-07-01', 'USD', true),
  ((select id from u), 'expense', 59.99, 'Internet', 'Fiber plan', 'monthly', '2026-07-03', 'USD', true),
  ((select id from u), 'expense', 35, 'Phone', 'Mobile plan', 'monthly', '2026-07-05', 'USD', true),
  ((select id from u), 'expense', 180, 'Health Insurance', 'Premium', 'monthly', '2026-07-08', 'USD', true),
  ((select id from u), 'expense', 39, 'Gym', 'Membership', 'monthly', '2026-07-02', 'USD', true),
  ((select id from u), 'expense', 10.99, 'Spotify', 'Music subscription', 'monthly', '2026-07-04', 'USD', true),
  ((select id from u), 'expense', 15.49, 'Netflix', 'Streaming', 'monthly', '2026-06-09', 'USD', true),
  ((select id from u), 'expense', 2.99, 'iCloud', 'Storage 200GB', 'monthly', '2026-06-12', 'USD', true),
  ((select id from u), 'income', 4200, 'Salary', 'Monthly net pay', 'monthly', '2026-06-25', 'USD', true),
  ((select id from u), 'expense', 99, 'Domain & Hosting', 'Annual renewal', 'yearly', '2026-09-15', 'USD', true),
  ((select id from u), 'expense', 120, 'Amazon Prime', 'Annual membership', 'yearly', '2026-11-02', 'USD', true);
