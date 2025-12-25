import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Department = Database['public']['Tables']['departments']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];
export type Worklog = Database['public']['Tables']['worklogs']['Row'];

export interface AttendanceWithProfile extends Attendance {
  employee?: Profile | null;
  approver?: Profile | null;
}

export interface WorklogWithProfile extends Worklog {
  employee?: Profile | null;
  approver?: Profile | null;
}

export interface ProfileWithDepartment extends Profile {
  department?: Department | null;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  total: number;
}

export type Holiday = Database['public']['Tables']['holidays']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];