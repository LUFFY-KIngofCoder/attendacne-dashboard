export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'employee';
          department_id: string | null;
          phone: string | null;
          join_date: string;
          is_active: boolean;
          must_change_password: boolean;
          weekly_wfh_limit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'employee';
          department_id?: string | null;
          phone?: string | null;
          join_date?: string;
          is_active?: boolean;
          must_change_password?: boolean;
          weekly_wfh_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'employee';
          department_id?: string | null;
          phone?: string | null;
          join_date?: string;
          is_active?: boolean;
          must_change_password?: boolean;
          weekly_wfh_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          status: 'present' | 'half_day' | 'on_leave' | 'absent';
          work_mode: 'wfh' | 'physical' | null;
          reason: string | null;
          check_in_time: string | null;
          check_out_time: string | null;
          is_approved: boolean;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          status: 'present' | 'half_day' | 'on_leave' | 'absent';
          work_mode?: 'wfh' | 'physical' | null;
          reason?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          status?: 'present' | 'half_day' | 'on_leave' | 'absent';
          work_mode?: 'wfh' | 'physical' | null;
          reason?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      worklogs: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          tasks_completed: string;
          hours_spent: number;
          attachments: Json;
          is_approved: boolean;
          approved_by: string | null;
          approved_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          tasks_completed: string;
          hours_spent: number;
          attachments?: Json;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          tasks_completed?: string;
          hours_spent?: number;
          attachments?: Json;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worklogs_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'worklogs_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      holidays: {
        Row: {
          id: string;
          date: string;
          is_holiday: boolean;
          name: string | null;
          description: string | null;
          event_name: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          is_holiday?: boolean;
          name?: string | null;
          description?: string | null;
          event_name?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          is_holiday?: boolean;
          name?: string | null;
          description?: string | null;
          event_name?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          date: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          name?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
