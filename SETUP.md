# Attendance & Worklog Dashboard - Setup Guide

## Overview

This is a complete, production-ready attendance and worklog management system with separate admin and employee portals. The application features role-based access control, comprehensive dashboard analytics, and real-time data management.

## Prerequisites

- Node.js 16+ and npm
- Supabase account (already configured in `.env`)
- Modern web browser

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

The database schema has already been configured in Supabase with:
- Departments table
- Profiles table (user management)
- Attendance table (attendance records)
- Worklogs table (daily work logs)

All tables have Row Level Security (RLS) enabled with proper policies.

### 3. Create Demo Accounts

To test the application, create these accounts in Supabase Authentication:

**Admin Account:**
- Email: `admin@company.com`
- Password: `admin123`

**Employee Account:**
- Email: `employee@company.com`
- Password: `employee123`

After creating the accounts, manually update their roles in the database:

```sql
-- Set admin role
UPDATE profiles SET role = 'admin' WHERE email = 'admin@company.com';

-- Set employee role (default)
UPDATE profiles SET role = 'employee' WHERE email = 'employee@company.com';
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Features

### Admin Portal

**Dashboard Overview**
- Real-time statistics (total employees, present today, absent today, pending approvals)
- Quick action buttons for common tasks
- Monthly analytics and trends

**Employee Management**
- Add, edit, and delete employees
- Assign departments and roles
- Set user permissions
- Bulk employee operations

**Attendance Management**
- View all employee attendance records
- Filter by date range, status, and employee
- Approve or reject attendance submissions
- Edit attendance records
- Export attendance data to CSV

**Worklog Management**
- Monitor employee work submissions
- View detailed worklog entries
- Approve or reject worklogs
- Track hours worked and tasks completed
- Generate worklog reports

### Employee Portal

**Dashboard**
- Personal statistics (days present, total hours, pending approvals)
- Quick access to common tasks
- Monthly attendance summary

**Attendance Submission**
- Mark attendance with status: Present, Half Day, On Leave, or Absent
- Provide reasons for absences/leaves
- View submission history
- Edit recent submissions (within 7 days)

**Worklog Submission**
- Submit daily work reports
- Log hours worked
- Document completed tasks
- View recent submissions
- Edit pending worklogs

**Attendance Calendar**
- Monthly attendance calendar view
- Visual indicators for different statuses
- Approval status display
- Navigate between months

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Layout.tsx
│   ├── Loading.tsx
│   ├── Modal.tsx
│   └── Navbar.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/                # Utilities and library setup
│   └── supabase.ts
├── pages/              # Page components
│   ├── Login.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── AttendanceManagement.tsx
│   │   ├── EmployeeManagement.tsx
│   │   └── WorklogManagement.tsx
│   └── employee/
│       ├── EmployeeDashboard.tsx
│       ├── AttendanceSubmission.tsx
│       ├── AttendanceCalendar.tsx
│       └── WorklogSubmission.tsx
├── types/              # TypeScript type definitions
│   ├── database.ts     # Supabase schema types
│   └── index.ts        # App types
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **State Management**: React Context API

## Build Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Preview production build
npm run preview
```

## Deployment

### Build the Application

```bash
npm run build
```

This creates a `dist` folder with optimized production files.

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to vercel.com and sign in
3. Click "New Project"
4. Select your repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click Deploy

### Deploy to Other Services

The application can be deployed to:
- Netlify
- AWS Amplify
- GitHub Pages
- Docker containers
- Traditional web servers

## API Integration

The application communicates with Supabase through the JavaScript client library. All data operations use:

- **Supabase Realtime** for live updates
- **Row Level Security (RLS)** for data access control
- **PostgREST** API for REST operations

## Security Features

- Role-based access control (Admin/Employee)
- Row Level Security on all database tables
- User authentication via Supabase Auth
- Session management with automatic logout
- HTTPS-only communication

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: Ensure `.env` file contains:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Issue: Cannot log in

**Solution**:
1. Verify email exists in Supabase Auth
2. Check password is correct
3. Ensure profile exists in `profiles` table with matching email

### Issue: Data not loading

**Solution**:
1. Check browser console for errors
2. Verify Supabase connection in network tab
3. Ensure RLS policies allow your user role
4. Check database has actual data

### Issue: Build fails

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Performance Tips

1. **Enable CDN**: Use Supabase's CDN for faster API responses
2. **Optimize Images**: Compress any images used in the app
3. **Code Splitting**: Vite automatically splits code by route
4. **Database Indexes**: Ensure frequently queried columns are indexed
5. **Caching**: Implement client-side caching for frequently accessed data

## Support

For issues or questions:
1. Check browser console for error messages
2. Review Supabase documentation
3. Check TypeScript errors: `npm run typecheck`
4. Verify environment variables are set

## License

This project is ready for commercial use. Modify and deploy as needed.

## Notes

- The application is fully responsive and mobile-friendly
- Dark mode can be added using Tailwind's dark mode utilities
- Multi-language support can be implemented using i18n library
- Email notifications can be added using Supabase Functions
