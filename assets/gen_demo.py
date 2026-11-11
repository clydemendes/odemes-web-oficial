#!/usr/bin/env python3
"""Generate realistic demo data for Odemes.
Produces:
  - demo-transactions.csv  (uploadable via Settings -> Import CSV)
  - demo-recurring.sql     (paste into Supabase SQL editor)
Today is anchored to 2026-06-09 to match the app's "now".
"""
import csv, random, datetime as dt

random.seed(42)
TODAY = dt.date(2026, 6, 9)
START = dt.date(2025, 11, 1)          # ~7.5 months of history
rows = []  # (date, type, category, note, amount)

def add(d, typ, cat, note, amt):
    if d is None:
        return
    rows.append((d.isoformat(), typ, cat, note, round(amt, 2)))

def jitter(base, pct=0.12):
    return base * (1 + random.uniform(-pct, pct))

# ---- iterate month by month ----
month = dt.date(START.year, START.month, 1)
while month <= TODAY:
    y, m = month.year, month.month
    def day(n):
        # valid date in this month, or None if it would be in the future
        try:
            d = dt.date(y, m, n)
        except ValueError:
            d = dt.date(y, m, 28)
        return d if d <= TODAY else None

    # ---- INCOME ----
    add(day(25), 'income', 'Salary', 'Monthly net pay', jitter(4200, 0.02))
    if random.random() < 0.55:
        add(day(random.randint(8, 20)), 'income', 'Freelance', 'Design project', jitter(750, 0.4))
    if m in (12, 6):
        add(day(20), 'income', 'Bonus', 'Quarterly bonus', jitter(1500, 0.15))
    if random.random() < 0.25:
        add(day(random.randint(5, 26)), 'income', 'Interest', 'Savings interest', jitter(22, 0.3))

    # ---- FIXED EXPENSES ----
    add(day(1),  'expense', 'Rent', 'Apartment', 1450)
    add(day(3),  'expense', 'Internet', 'Fiber plan', 59.99)
    add(day(5),  'expense', 'Phone', 'Mobile plan', 35)
    add(day(6),  'expense', 'Electricity', 'Utility bill', jitter(72, 0.25))
    add(day(8),  'expense', 'Health Insurance', 'Premium', 180)
    add(day(2),  'expense', 'Gym', 'Membership', 39)
    add(day(4),  'expense', 'Spotify', 'Music subscription', 10.99)
    add(day(9),  'expense', 'Netflix', 'Streaming', 15.49)
    add(day(12), 'expense', 'iCloud', 'Storage 200GB', 2.99)
    if m % 3 == 0:
        add(day(15), 'expense', 'Insurance', 'Renter insurance', 28)

    # ---- GROCERIES (weekly) ----
    for wk in (2, 9, 16, 23, 29):
        add(day(wk + random.randint(0, 2)), 'expense', 'Groceries',
            random.choice(['Supermarket', 'Whole Foods', 'Trader Joe\'s', 'Local market']),
            jitter(78, 0.3))

    # ---- DINING / COFFEE (frequent) ----
    for _ in range(random.randint(6, 10)):
        add(day(random.randint(1, 28)), 'expense', 'Dining',
            random.choice(['Lunch', 'Dinner out', 'Brunch', 'Takeout', 'Pizza']),
            jitter(24, 0.5))
    for _ in range(random.randint(8, 14)):
        add(day(random.randint(1, 28)), 'expense', 'Coffee',
            random.choice(['Cafe', 'Espresso', 'Latte', 'Cold brew']),
            jitter(4.5, 0.3))

    # ---- TRANSPORT ----
    for _ in range(random.randint(2, 4)):
        add(day(random.randint(1, 28)), 'expense', 'Transport',
            random.choice(['Uber', 'Metro card', 'Gas', 'Parking']),
            jitter(18, 0.5))

    # ---- SHOPPING / MISC ----
    for _ in range(random.randint(2, 5)):
        add(day(random.randint(1, 28)), 'expense', random.choice(['Shopping', 'Clothes', 'Home', 'Electronics']),
            random.choice(['Amazon', 'Online order', 'Store', 'Gadget']),
            jitter(45, 0.7))

    # ---- ENTERTAINMENT / OTHER ----
    if random.random() < 0.7:
        add(day(random.randint(1, 28)), 'expense', 'Entertainment',
            random.choice(['Movie', 'Concert', 'Games', 'Books']), jitter(30, 0.6))
    if random.random() < 0.4:
        add(day(random.randint(1, 28)), 'expense', 'Health',
            random.choice(['Pharmacy', 'Dentist', 'Doctor']), jitter(40, 0.5))
    if random.random() < 0.3:
        add(day(random.randint(1, 28)), 'expense', 'Travel',
            random.choice(['Flight', 'Hotel', 'Train']), jitter(220, 0.5))

    # next month
    month = dt.date(y + (m // 12), (m % 12) + 1, 1)

# de-dup exact collisions are fine; sort newest first
rows.sort(key=lambda r: r[0], reverse=True)

with open('demo-transactions.csv', 'w', newline='') as f:
    w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    w.writerow(['Date', 'Type', 'Category', 'Note', 'Amount'])
    for d, typ, cat, note, amt in rows:
        w.writerow([d, typ, cat, note, f'{amt:.2f}'])

inc = sum(r[4] for r in rows if r[1] == 'income')
exp = sum(r[4] for r in rows if r[1] == 'expense')
print(f'transactions: {len(rows)} rows')
print(f'  income total : {inc:,.2f}')
print(f'  expense total: {exp:,.2f}')
print(f'  net          : {inc-exp:,.2f}')

# ---------------------------------------------------------------------------
# Recurring: no CSV importer exists, emit SQL for the Supabase SQL editor.
# ---------------------------------------------------------------------------
def nd(day_of_month):
    """Next due: this month's day if still upcoming, else next month."""
    cand = dt.date(TODAY.year, TODAY.month, day_of_month)
    if cand < TODAY:
        cand = dt.date(TODAY.year + (TODAY.month // 12), (TODAY.month % 12) + 1, day_of_month)
    return cand.isoformat()

recurring = [
    ('expense', 1450,  'Rent',             'Apartment',          'monthly', nd(1)),
    ('expense', 59.99, 'Internet',         'Fiber plan',         'monthly', nd(3)),
    ('expense', 35,    'Phone',            'Mobile plan',        'monthly', nd(5)),
    ('expense', 180,   'Health Insurance', 'Premium',            'monthly', nd(8)),
    ('expense', 39,    'Gym',              'Membership',         'monthly', nd(2)),
    ('expense', 10.99, 'Spotify',          'Music subscription', 'monthly', nd(4)),
    ('expense', 15.49, 'Netflix',          'Streaming',          'monthly', nd(9)),
    ('expense', 2.99,  'iCloud',           'Storage 200GB',      'monthly', nd(12)),
    ('income',  4200,  'Salary',           'Monthly net pay',    'monthly', nd(25)),
    ('expense', 99,    'Domain & Hosting', 'Annual renewal',     'yearly',  '2026-09-15'),
    ('expense', 120,   'Amazon Prime',     'Annual membership',  'yearly',  '2026-11-02'),
]

def sql_str(s):
    return "'" + s.replace("'", "''") + "'"

with open('demo-recurring.sql', 'w') as f:
    f.write("-- Odemes demo: recurring transactions\n")
    f.write("-- Run in Supabase -> SQL Editor while logged-in user owns the rows.\n")
    f.write("-- Replace the email below with the demo account's email.\n\n")
    f.write("with u as (select id from auth.users where email = 'clydesemedo@gmail.com')\n")
    f.write("insert into recurring_transactions\n")
    f.write("  (user_id, type, amount, category, note, frequency, next_due_date, currency, is_active)\n")
    f.write("values\n")
    vals = []
    for typ, amt, cat, note, freq, due in recurring:
        vals.append(
            f"  ((select id from u), {sql_str(typ)}, {amt}, {sql_str(cat)}, "
            f"{sql_str(note)}, {sql_str(freq)}, {sql_str(due)}, 'USD', true)"
        )
    f.write(",\n".join(vals) + ";\n")
print(f'recurring: {len(recurring)} rows -> demo-recurring.sql')
