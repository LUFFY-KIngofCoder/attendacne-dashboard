# Database Schema

## Tables Overview

### 1. Departments
Stores company departments for employee organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Department name (unique) |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Sample Data:**
- Engineering
- Human Resources
- Sales
- Marketing
- Finance
- Operations

---

### 2. Profiles
Extended user information linked to Supabase auth users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users.id) |
| email | TEXT | User email (unique) |
| full_name | TEXT | Employee full name |
| role | TEXT | 'admin' or 'employee' |
| department_id | UUID | Foreign key to departments (nullable) |
| phone | TEXT | Contact number (nullable) |
| join_date | DATE | Employment start date |
| is_active | BOOLEAN | Account status (default: true) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Relationships:**
- Foreign Key: `department_id` → `departments.id`

**Constraints:**
- Unique: email
- Check: role IN ('admin', 'employee')

---

### 3. Attendance
Daily attendance records for employees.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | Foreign key to profiles |
| date | DATE | Attendance date |
| status | TEXT | 'present', 'half_day', 'on_leave', or 'absent' |
| reason | TEXT | Reason for leave/absence (nullable) |
| check_in_time | TIMESTAMPTZ | Check-in timestamp (nullable) |
| check_out_time | TIMESTAMPTZ | Check-out timestamp (nullable) |
| is_approved | BOOLEAN | Admin approval status (default: false) |
| approved_by | UUID | Admin ID who approved (nullable) |
| approved_at | TIMESTAMPTZ | Approval timestamp (nullable) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Relationships:**
- Foreign Key: `employee_id` → `profiles.id` (ON DELETE CASCADE)
- Foreign Key: `approved_by` → `profiles.id` (ON DELETE SET NULL)

**Constraints:**
- Unique: (employee_id, date) - One record per employee per day
- Check: status IN ('present', 'half_day', 'on_leave', 'absent')

**Indexes:**
- idx_attendance_employee (employee_id)
- idx_attendance_date (date)
- idx_attendance_status (status)

---

### 4. Worklogs
Daily work report submissions from employees.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | Foreign key to profiles |
| date | DATE | Worklog date |
| tasks_completed | TEXT | Description of completed tasks |
| hours_spent | DECIMAL(4,2) | Hours worked (0-24) |
| attachments | JSONB | Array of file metadata (default: []) |
| is_approved | BOOLEAN | Admin approval status (default: false) |
| approved_by | UUID | Admin ID who approved (nullable) |
| approved_at | TIMESTAMPTZ | Approval timestamp (nullable) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Relationships:**
- Foreign Key: `employee_id` → `profiles.id` (ON DELETE CASCADE)
- Foreign Key: `approved_by` → `profiles.id` (ON DELETE SET NULL)

**Constraints:**
- Check: hours_spent >= 0 AND hours_spent <= 24

**Indexes:**
- idx_worklogs_employee (employee_id)
- idx_worklogs_date (date)

---

## Row Level Security (RLS) Policies

### Departments
- **SELECT**: Anyone authenticated
- **INSERT/UPDATE/DELETE**: Admins only

### Profiles
- **SELECT (User's own)**: Users can read their own profile
- **SELECT (All)**: Admins can read all profiles
- **INSERT**: Admins only
- **UPDATE (Own)**: Users can update limited fields
- **UPDATE (Any)**: Admins can update any profile
- **DELETE**: Admins only

### Attendance
- **SELECT (Own)**: Employees see their records
- **SELECT (All)**: Admins see all records
- **INSERT (Own)**: Employees create their records
- **UPDATE (Own)**: Employees update their records
- **UPDATE (Any)**: Admins can update any record
- **DELETE**: Admins only

### Worklogs
- **SELECT (Own)**: Employees see their records
- **SELECT (All)**: Admins see all records
- **INSERT (Own)**: Employees create their records
- **UPDATE (Own)**: Employees update their records
- **UPDATE (Any)**: Admins can update any record
- **DELETE**: Admins only

---

## Data Flow

### Employee Workflow
1. **Login** → Authentication via email/password
2. **Mark Attendance** → Insert into attendance table
3. **Submit Worklog** → Insert into worklogs table
4. **View Calendar** → Query attendance records with filters
5. **Edit Submission** → Update own records (if not approved)

### Admin Workflow
1. **Login** → Authentication via email/password
2. **View Dashboard** → Aggregate queries for statistics
3. **Manage Employees** → CRUD operations on profiles
4. **Review Attendance** → Query and filter attendance records
5. **Approve/Edit** → Update attendance/worklog approval status
6. **Export Reports** → Generate CSV files from data

---

## Database Triggers

### 1. on_auth_user_created
Automatically creates a profile when a new user signs up.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2. Timestamp Triggers
Auto-update `updated_at` field on record updates.

```sql
set_updated_at_profiles
set_updated_at_attendance
set_updated_at_worklogs
```

---

## Query Examples

### Get employee's monthly attendance
```sql
SELECT * FROM attendance
WHERE employee_id = 'user-id'
  AND date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY date;
```

### Get pending approvals
```sql
SELECT * FROM attendance
WHERE is_approved = false
  OR (SELECT COUNT(*) FROM worklogs WHERE is_approved = false) > 0;
```

### Get employee statistics
```sql
SELECT
  COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
  COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
  COUNT(CASE WHEN status = 'on_leave' THEN 1 END) as leave_days,
  SUM(hours_spent) as total_hours
FROM attendance a
LEFT JOIN worklogs w ON a.employee_id = w.employee_id AND a.date = w.date
WHERE a.employee_id = 'user-id';
```

---

## Backup and Restore

### Automated Backups
Supabase automatically backs up your database daily. Retain for 30 days by default.

### Manual Export
Use Supabase dashboard to export data as CSV or SQL dump.

### Data Migration
To migrate data:
1. Export from source Supabase project
2. Create new project
3. Import schema using provided migrations
4. Restore data using CSV import

---

## Performance Optimization

### Current Indexes
All frequently queried columns are indexed:
- `profiles.department_id`
- `profiles.role`
- `attendance.employee_id`
- `attendance.date`
- `attendance.status`
- `worklogs.employee_id`
- `worklogs.date`

### Recommended Monitoring
1. Monitor slow queries in Supabase logs
2. Check database size in project settings
3. Optimize RLS policies for performance
4. Consider adding composite indexes for common filter combinations

### Connection Pooling
Supabase provides connection pooling to handle multiple concurrent requests efficiently.
