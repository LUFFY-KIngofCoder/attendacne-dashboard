#!/usr/bin/env node
import 'dotenv/config';
// Seed script: creates demo auth users via Supabase Admin API and inserts profiles
// Usage: set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment, then:
//   node scripts/seed_supabase.js

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function createUser(email, password) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();

  // If user already exists, fetch and return the existing user instead of failing
  if (!res.ok) {
    try {
      const parsed = data;
      if (parsed && (parsed.error_code === 'email_exists' || parsed.message?.includes('email'))) {
        // fetch all users (small projects) and find the user by email
        const listRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users?page=0&per_page=1000`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const found = listData.users?.find(u => u.email === email) || listData.find(u => u.email === email);
          if (found) return found;
        }
      }
    } catch (err) {
      // ignore and throw original
    }

    throw new Error(JSON.stringify(data));
  }

  return data;
}

async function insertDepartment(name) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  // Ignore conflict errors (department already exists)
  if (!res.ok && data.code !== '23505') {
    throw new Error(`Failed to create department: ${JSON.stringify(data)}`);
  }
  return data;
}

async function insertProfile(userId, email, full_name, role = 'employee', departmentId = null) {
  // Check if a profile already exists for this user (trigger may have created it)
  const check = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!check.ok) {
    const err = await check.text();
    throw new Error(`Failed to check existing profile: ${err}`);
  }
  const existing = await check.json();
  
  const profileData = {
    id: userId,
    email,
    full_name,
    role,
    ...(departmentId && { department_id: departmentId }),
  };

  if (Array.isArray(existing) && existing.length > 0) {
    // Update existing profile
    const updateRes = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(profileData),
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error(`Failed to update profile: ${JSON.stringify(updateData)}`);
    console.log('Profile updated for user:', userId);
    return Array.isArray(updateData) ? updateData[0] : updateData;
  }

  // Create new profile
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to create profile: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data[0] : data;
}

(async () => {
  try {
    // Step 1: Create departments
    console.log('Creating departments...');
    const departments = [
      'Engineering',
      'Human Resources',
      'Sales',
      'Marketing',
      'Finance',
      'Operations'
    ];
    
    for (const deptName of departments) {
      try {
        await insertDepartment(deptName);
        console.log(`  ✓ Department created: ${deptName}`);
      } catch (err) {
        console.log(`  ⚠ Department may already exist: ${deptName}`);
      }
    }

    // Step 2: Create admin user
    console.log('\nCreating admin user...');
    const admin = await createUser('admin@company.com', 'admin123');
    console.log('  ✓ Admin user created:', admin.id);
    await insertProfile(admin.id, 'admin@company.com', 'Admin User', 'admin');
    console.log('  ✓ Admin profile created');

    // Step 3: Create employee user
    console.log('\nCreating employee user...');
    const emp = await createUser('employee@company.com', 'employee123');
    console.log('  ✓ Employee user created:', emp.id);
    
    // Get Engineering department ID to assign to employee
    const deptRes = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/departments?name=eq.Engineering`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });
    const deptData = await deptRes.json();
    const engineeringDeptId = Array.isArray(deptData) && deptData.length > 0 ? deptData[0].id : null;
    
    await insertProfile(emp.id, 'employee@company.com', 'Demo Employee', 'employee', engineeringDeptId);
    console.log('  ✓ Employee profile created');

    console.log('\n✅ Seeding complete!');
    console.log('\nLogin credentials:');
    console.log('  Admin: admin@company.com / admin123');
    console.log('  Employee: employee@company.com / employee123');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  }
})();
