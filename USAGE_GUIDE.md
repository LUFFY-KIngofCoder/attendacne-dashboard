# Usage Guide - Attendance & Worklog Dashboard

## Getting Started

### First Time Setup (Admin)

1. **Log in** with admin credentials
   - Email: `admin@company.com`
   - Password: `admin123`

2. **Add Your Team**
   - Navigate to "Employees" tab in Admin Dashboard
   - Click "Add Employee"
   - Fill in employee details (name, email, department, role)
   - Set a temporary password
   - Employee will receive credentials

3. **Configure Departments**
   - Pre-loaded with common departments
   - Add custom departments as needed via database or API

4. **Review Dashboard**
   - View today's attendance statistics
   - Monitor pending approvals
   - Check employee activity

---

## Admin Operations

### Employee Management

#### Adding a New Employee

1. Go to **Admin Dashboard** → **Employees** tab
2. Click **"Add Employee"** button
3. Fill in the form:
   - Email (required, unique)
   - Password (required, 8+ characters recommended)
   - Full Name (required)
   - Phone (optional)
   - Department (select from dropdown)
   - Role (admin or employee)
4. Click **"Create"**

#### Editing Employee Details

1. In **Employees** tab, find the employee
2. Click the **Edit** icon (pencil)
3. Update fields (password cannot be changed here)
4. Click **"Update"**

#### Deactivating an Employee

1. In **Employees** tab, find the employee
2. Click the **Delete** icon (trash)
3. Confirm deletion
4. Employee will be marked inactive

#### Searching Employees

1. Use the search box at the top of **Employees** tab
2. Search by name or email
3. Results update in real-time

---

### Attendance Management

#### Viewing Attendance Records

1. Go to **Admin Dashboard** → **Attendance** tab
2. Set date range using the date pickers
3. Optionally filter by status (Present, Half Day, On Leave, Absent)
4. View all matching records in the table

#### Approving Attendance

1. In **Attendance** tab, find pending record
2. Status shows "Pending" if not approved
3. Click the **checkmark** icon to approve
4. Record updates automatically

#### Rejecting Attendance

1. In **Attendance** tab, find record to reject
2. Click the **X** icon
3. Confirm rejection
4. Record is deleted

#### Editing Attendance

1. In **Attendance** tab, click **"Edit"** for the record
2. Modal opens with editable fields
3. Update status or reason
4. Click **"Update"**

#### Exporting Attendance Data

1. In **Attendance** tab, set desired date range and filters
2. Click **"Export CSV"** button
3. File downloads with current filtered data
4. Open in Excel/Sheets for further analysis

---

### Worklog Management

#### Viewing Worklogs

1. Go to **Admin Dashboard** → **Worklogs** tab
2. Filter by date range
3. Optionally filter by approval status (All, Approved, Pending)
4. View all matching records

#### Viewing Worklog Details

1. In **Worklogs** tab, click the **eye** icon
2. Modal shows full worklog details:
   - Employee name
   - Date
   - Tasks completed
   - Hours spent
   - Approval status
3. Close modal when done

#### Approving Worklogs

1. In **Worklogs** tab, find pending worklog
2. Click the **checkmark** icon
3. Status changes to "Approved"
4. Admin is recorded as approver

#### Rejecting Worklogs

1. In **Worklogs** tab, find worklog to reject
2. Click the **X** icon
3. Confirm rejection
4. Record is deleted

#### Exporting Worklog Data

1. In **Worklogs** tab, set desired filters
2. Click **"Export CSV"** button
3. File downloads with current data
4. Contains: Date, Employee, Tasks, Hours, Approval Status

---

## Employee Operations

### Dashboard Overview

1. **Log in** with employee credentials
2. View your statistics:
   - Days Present this month
   - Total Hours worked
   - Pending Approvals count
   - Total days in current month
3. Quick action buttons for common tasks

---

### Marking Attendance

#### Daily Attendance Submission

1. Navigate to **"Mark Attendance"** tab
2. Select your status:
   - **Present**: Full day at work
   - **Half Day**: Partial work day
   - **On Leave**: Full day leave
3. If selecting "Half Day" or "On Leave", provide a reason
4. Click **"Mark Attendance"** or **"Update Attendance"**
5. Confirmation message appears

#### Editing Attendance

1. In **Mark Attendance** tab, existing entry shows status
2. Change status or reason as needed
3. Click **"Update Attendance"**
4. Note: Can only edit if not yet approved

#### Important Notes

- One attendance record per day (cannot have multiple entries)
- Record must be submitted by end of business day
- Admins can edit even after approval
- Reason is required for leaves/half days

---

### Submitting Worklogs

#### Daily Worklog Submission

1. Navigate to **"Submit Worklog"** tab
2. **Select Date**: Pick date for worklog (last 7 days available)
3. **Enter Hours**: Number of hours worked (0-24)
4. **Describe Tasks**: Write detailed description of completed tasks
5. Click **"Submit Worklog"**
6. Success message confirms submission

#### Adding Multiple Days

Submit separate worklogs for different dates:
1. Submit worklog for Day 1
2. Change date in form to Day 2
3. Submit again
4. Repeat as needed

#### Editing Worklogs

1. In **"Submit Worklog"** tab, scroll to "Recent Worklogs"
2. Find worklog to edit (must not be approved)
3. Click the **edit** icon
4. Modal opens with editable fields
5. Update tasks and hours
6. Click **"Update"**

#### Worklog Tips

- Be detailed in task descriptions for admin review
- Log hours accurately
- Include any blockers or notes
- Submit end of day for timely approval
- Cannot edit approved worklogs

---

### Attendance Calendar

#### Viewing Your Calendar

1. Navigate to **"Calendar"** tab
2. View current month
3. Color-coded calendar shows attendance status:
   - Green dot: Present
   - Yellow dot: Half Day
   - Blue dot: On Leave
   - Red dot: Absent
   - Black dot: Approved

#### Navigating Months

1. Use arrow buttons to change month
2. Left arrow: Previous month
3. Right arrow: Next month
4. Arrows disabled for future months

#### Interpreting the Calendar

- **Colored dots**: Status of that day
- **Small black dot**: Mark of approval
- **Blue border**: Today's date
- **Empty dates**: No submission yet

---

## Common Workflows

### Workflow 1: Employee Submits for Approval

**Employee:**
1. Log in to dashboard
2. Mark attendance for today
3. Submit worklog with tasks
4. Status shows "Pending"

**Admin:**
1. View Attendance tab → see pending record
2. Review attendance details
3. Click checkmark to approve
4. View Worklog tab → see pending worklog
5. Click eye icon to review
6. Click checkmark to approve

**Employee:**
1. Return to dashboard
2. Pending Approvals count decreases
3. Calendar shows approval (black dot)

---

### Workflow 2: Bulk Attendance Export

**Admin:**
1. Navigate to Attendance tab
2. Set date range (e.g., entire month)
3. Optionally filter by status or department
4. Click "Export CSV"
5. File downloads (e.g., `attendance_2024-01-01_2024-01-31.csv`)
6. Open in Excel/Google Sheets
7. Analyze or redistribute to HR

---

### Workflow 3: Monthly Review

**Admin:**
1. **First day of month:**
   - Export previous month's attendance
   - Export previous month's worklogs
   - Archive reports

2. **Throughout month:**
   - Monitor Dashboard for statistics
   - Approve submissions regularly
   - Address any discrepancies

3. **End of month:**
   - Export full month data
   - Generate summary report
   - Share with HR/management

---

## Troubleshooting

### Employee Cannot Log In

**Solutions:**
1. Verify email spelling (case-insensitive)
2. Check password (case-sensitive)
3. Confirm employee is active in admin panel
4. Try password reset if available
5. Check browser cookies are enabled

### Attendance Record Shows Old Data

**Solutions:**
1. Page may be cached - refresh browser (Ctrl+R or Cmd+R)
2. Check you're viewing correct date range
3. Clear browser cache if problem persists
4. Try different browser if issue continues

### Cannot Edit Attendance/Worklog

**Reasons:**
- Record already approved (admins can still edit)
- Date is older than 7 days (if employee)
- User doesn't have permission
- Browser JavaScript disabled

**Solutions:**
1. Ask admin to edit if record is approved
2. Submit new record for more recent dates
3. Enable JavaScript in browser settings
4. Contact admin for permission issues

### Export Button Not Working

**Solutions:**
1. Ensure date range is set and valid
2. Verify there's data to export
3. Check pop-up blocker is disabled
4. Try different browser
5. Clear browser cache

### Dashboard Not Updating

**Solutions:**
1. Refresh page (F5 or Cmd+R)
2. Clear browser cache
3. Close and reopen application
4. Check internet connection
5. Verify Supabase status

---

## Best Practices

### For Admins

1. **Daily Review**: Check pending approvals daily
2. **Weekly Export**: Export weekly data for record-keeping
3. **Monthly Audit**: Review attendance patterns
4. **Employee Onboarding**: Add employees with complete info
5. **Timely Approvals**: Approve submissions within 24 hours
6. **Data Backup**: Export critical data regularly

### For Employees

1. **Daily Submission**: Mark attendance every day
2. **Detailed Logging**: Write descriptive worklog entries
3. **Timely Submission**: Submit before end of business day
4. **Accurate Hours**: Log actual hours worked
5. **Reason Documentation**: Always provide reason for leaves
6. **Prompt Corrections**: Correct mistakes quickly if found

---

## Keyboard Shortcuts

### Global
- `Ctrl+R` (or `Cmd+R` on Mac): Refresh page
- `Ctrl+K` (or `Cmd+K`): Focus search (where available)

### Within Forms
- `Tab`: Move to next field
- `Shift+Tab`: Move to previous field
- `Enter`: Submit form (when focused on button)
- `Esc`: Close modal

---

## Tips for Better Experience

1. **Use Chrome or Firefox**: Best browser compatibility
2. **Keep Device Updated**: Ensures security features
3. **Check Internet**: Slow connection may cause delays
4. **Clear Cache Monthly**: Improves app performance
5. **Use Modern Device**: Better performance on newer hardware

---

## Getting Help

- Check this guide first
- Review DATABASE_SCHEMA.md for data structure questions
- Review SETUP.md for technical setup issues
- Contact your IT administrator for access issues
