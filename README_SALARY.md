Salary system overview and how to lock a salary cycle
=================================================

This documents the new salary system (monthly fixed) integrated with attendance.

Key points
----------
- Salary is earned daily and finalized when an admin locks a salary cycle for a month.
- Company works 6 days/week; Sundays are non-working by default. Admin-defined holidays are paid and always count as paid working days.
- Salary is calculated per employee per month and becomes immutable after lock.
- Payments are tracked separately and do not change salaries.

DB changes
----------
- `profiles.monthly_salary` (numeric) added.
- `salary_cycles`, `salary_earnings`, `salary_payments` tables added.

Locking a salary cycle (admin)
------------------------------
We added a helper script to compute and lock a salary cycle. It:

1. Verifies there are NO pending attendance approvals (`is_approved IS NULL`) in the month.
2. Creates a `salary_cycles` row (locked_at, locked_by).
3. For each eligible employee (active, with `monthly_salary` set, and joined on/before cycle end) it:
   - computes eligible working days (exclude Sundays, include holidays)
   - computes `per_day_salary = monthly_salary / total_eligible_working_days`
   - sums daily credits per rules (approved present/half_day, holidays paid, denied => absent)
   - writes a `salary_earnings` row with `gross_earned`

Run locally (admin):

```bash
npm install minimist
node -r dotenv/config scripts/lock_salary_cycle.js --year=2025 --month=12 --admin=<admin_profile_id>
```

Notes
-----
- The script uses the `SUPABASE_SERVICE_ROLE_KEY` to insert records into the database via the REST API.
- After locking, salary numbers are stored and will not be recalculated.
- To record payments, insert rows into `salary_payments` linking to the `salary_cycles` and `employee_id`.

Next steps (optional)
---------------------
- Add an admin UI to: run lock, view cycle earnings, and record payments.
- Add DB constraints/triggers to prevent editing attendance for locked cycles and to prevent modification of `salary_earnings` once created.
