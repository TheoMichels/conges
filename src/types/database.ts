export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  holy: {
    Tables: {
      year_plans: {
        Row: {
          id: string;
          user_id: string;
          year: string;
          initial_leave: number;
          carried_over: number;
          csupp: number;
          public_holidays: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year: string;
          initial_leave?: number;
          carried_over?: number;
          csupp?: number;
          public_holidays?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year?: string;
          initial_leave?: number;
          carried_over?: number;
          csupp?: number;
          public_holidays?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "year_plans_user_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      leave_entries: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          kind: string;
          label: string;
          start_date: string | null;
          end_date: string | null;
          start_half: string | null;
          end_half: string | null;
          month: number | null;
          days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          kind: string;
          label: string;
          start_date?: string | null;
          end_date?: string | null;
          start_half?: string | null;
          end_half?: string | null;
          month?: number | null;
          days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          kind?: string;
          label?: string;
          start_date?: string | null;
          end_date?: string | null;
          start_half?: string | null;
          end_half?: string | null;
          month?: number | null;
          days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leave_entries_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "year_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_entries_user_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: {
          user_id: string;
          default_initial_leave: number;
          country: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          default_initial_leave?: number;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          default_initial_leave?: number;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_user_fk";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
