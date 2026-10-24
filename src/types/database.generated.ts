export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_user_id: string | null;
          agency_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id: string;
          metadata: Json;
          request_id: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          agency_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          request_id?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          agency_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      agencies: {
        Row: {
          contact_email: string;
          country_code: string;
          created_at: string;
          id: string;
          logo_path: string | null;
          name: string;
          primary_specialization: string | null;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          contact_email: string;
          country_code: string;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          primary_specialization?: string | null;
          slug: string;
          status?: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string;
          country_code?: string;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          primary_specialization?: string | null;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agency_invitations: {
        Row: {
          accepted_at: string | null;
          agency_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          role: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          agency_id: string;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          role: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          agency_id?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          role?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agency_invitations_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      agency_memberships: {
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          joined_at: string | null;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          role: string;
          status?: string;
          user_id: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agency_memberships_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      application_answers: {
        Row: {
          agency_id: string;
          answer: Json;
          application_id: string;
          created_at: string;
          id: string;
          job_id: string;
          question_id: string;
        };
        Insert: {
          agency_id: string;
          answer: Json;
          application_id: string;
          created_at?: string;
          id?: string;
          job_id: string;
          question_id: string;
        };
        Update: {
          agency_id?: string;
          answer?: Json;
          application_id?: string;
          created_at?: string;
          id?: string;
          job_id?: string;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_answers_agency_id_job_id_application_id_fkey";
            columns: ["agency_id", "job_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "job_id", "id"];
          },
          {
            foreignKeyName: "application_answers_agency_id_job_id_question_id_fkey";
            columns: ["agency_id", "job_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "job_application_questions";
            referencedColumns: ["agency_id", "job_id", "id"];
          },
        ];
      };
      applications: {
        Row: {
          agency_id: string;
          candidate_id: string;
          cover_note: string | null;
          created_at: string;
          id: string;
          job_id: string;
          processing_status: string;
          source: string;
          status: string;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          agency_id: string;
          candidate_id: string;
          cover_note?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          processing_status?: string;
          source?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          candidate_id?: string;
          cover_note?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          processing_status?: string;
          source?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_agency_id_candidate_id_fkey";
            columns: ["agency_id", "candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "applications_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      candidate_documents: {
        Row: {
          agency_id: string;
          application_id: string;
          candidate_id: string;
          content_type: string;
          created_at: string;
          document_type: string;
          file_name: string;
          id: string;
          size_bytes: number;
          storage_path: string;
        };
        Insert: {
          agency_id: string;
          application_id: string;
          candidate_id: string;
          content_type: string;
          created_at?: string;
          document_type?: string;
          file_name: string;
          id?: string;
          size_bytes: number;
          storage_path: string;
        };
        Update: {
          agency_id?: string;
          application_id?: string;
          candidate_id?: string;
          content_type?: string;
          created_at?: string;
          document_type?: string;
          file_name?: string;
          id?: string;
          size_bytes?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_documents_agency_id_application_id_fkey";
            columns: ["agency_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "candidate_documents_agency_id_candidate_id_fkey";
            columns: ["agency_id", "candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      candidates: {
        Row: {
          agency_id: string;
          created_at: string;
          email: string;
          email_normalized: string | null;
          full_name: string;
          id: string;
          linkedin_url: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          email: string;
          email_normalized?: string | null;
          full_name: string;
          id?: string;
          linkedin_url?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          email?: string;
          email_normalized?: string | null;
          full_name?: string;
          id?: string;
          linkedin_url?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      client_contacts: {
        Row: {
          agency_id: string;
          client_id: string;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_primary: boolean;
          job_title: string | null;
          phone: string | null;
        };
        Insert: {
          agency_id: string;
          client_id: string;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          is_primary?: boolean;
          job_title?: string | null;
          phone?: string | null;
        };
        Update: {
          agency_id?: string;
          client_id?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_primary?: boolean;
          job_title?: string | null;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_contacts_agency_id_client_id_fkey";
            columns: ["agency_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      client_invitations: {
        Row: {
          accepted_at: string | null;
          agency_id: string;
          client_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          role: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          agency_id: string;
          client_id: string;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          role: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          agency_id?: string;
          client_id?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          role?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_invitations_agency_id_client_id_fkey";
            columns: ["agency_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      client_job_access: {
        Row: {
          access_role: string;
          agency_id: string;
          client_id: string;
          created_at: string;
          id: string;
          job_id: string;
          user_id: string;
        };
        Insert: {
          access_role: string;
          agency_id: string;
          client_id: string;
          created_at?: string;
          id?: string;
          job_id: string;
          user_id: string;
        };
        Update: {
          access_role?: string;
          agency_id?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          job_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_job_access_agency_id_client_id_user_id_fkey";
            columns: ["agency_id", "client_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "client_memberships";
            referencedColumns: ["agency_id", "client_id", "user_id"];
          },
          {
            foreignKeyName: "client_job_access_client_id_job_id_fkey";
            columns: ["client_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["client_id", "id"];
          },
        ];
      };
      client_memberships: {
        Row: {
          agency_id: string;
          client_id: string;
          created_at: string;
          id: string;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          agency_id: string;
          client_id: string;
          created_at?: string;
          id?: string;
          role: string;
          status?: string;
          user_id: string;
        };
        Update: {
          agency_id?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_memberships_agency_id_client_id_fkey";
            columns: ["agency_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      clients: {
        Row: {
          account_manager_id: string | null;
          agency_id: string;
          country_code: string | null;
          created_at: string;
          id: string;
          industry: string | null;
          internal_notes: string | null;
          location: string | null;
          name: string;
          status: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          account_manager_id?: string | null;
          agency_id: string;
          country_code?: string | null;
          created_at?: string;
          id?: string;
          industry?: string | null;
          internal_notes?: string | null;
          location?: string | null;
          name: string;
          status?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          account_manager_id?: string | null;
          agency_id?: string;
          country_code?: string | null;
          created_at?: string;
          id?: string;
          industry?: string | null;
          internal_notes?: string | null;
          location?: string | null;
          name?: string;
          status?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      communications: {
        Row: {
          agency_id: string;
          attempt_count: number;
          created_at: string;
          delivered_at: string | null;
          id: string;
          idempotency_key: string;
          last_error: string | null;
          message_type: string;
          provider_message_id: string | null;
          recipient_email: string;
          related_entity_id: string | null;
          related_entity_type: string | null;
          sent_at: string | null;
          status: string;
        };
        Insert: {
          agency_id: string;
          attempt_count?: number;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          idempotency_key: string;
          last_error?: string | null;
          message_type: string;
          provider_message_id?: string | null;
          recipient_email: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          sent_at?: string | null;
          status?: string;
        };
        Update: {
          agency_id?: string;
          attempt_count?: number;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          idempotency_key?: string;
          last_error?: string | null;
          message_type?: string;
          provider_message_id?: string | null;
          recipient_email?: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          sent_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communications_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      hiring_request_attachments: {
        Row: {
          agency_id: string;
          content_type: string;
          created_at: string;
          file_name: string;
          hiring_request_id: string;
          id: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          agency_id: string;
          content_type: string;
          created_at?: string;
          file_name: string;
          hiring_request_id: string;
          id?: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          agency_id?: string;
          content_type?: string;
          created_at?: string;
          file_name?: string;
          hiring_request_id?: string;
          id?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hiring_request_attachments_agency_id_hiring_request_id_fkey";
            columns: ["agency_id", "hiring_request_id"];
            isOneToOne: false;
            referencedRelation: "hiring_requests";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      hiring_request_messages: {
        Row: {
          agency_id: string;
          author_user_id: string;
          created_at: string;
          hiring_request_id: string;
          id: string;
          message: string;
          visibility: string;
        };
        Insert: {
          agency_id: string;
          author_user_id: string;
          created_at?: string;
          hiring_request_id: string;
          id?: string;
          message: string;
          visibility: string;
        };
        Update: {
          agency_id?: string;
          author_user_id?: string;
          created_at?: string;
          hiring_request_id?: string;
          id?: string;
          message?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hiring_request_messages_agency_id_hiring_request_id_fkey";
            columns: ["agency_id", "hiring_request_id"];
            isOneToOne: false;
            referencedRelation: "hiring_requests";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      hiring_request_requirements: {
        Row: {
          agency_id: string;
          created_at: string;
          description: string | null;
          hiring_request_id: string;
          id: string;
          label: string;
          requirement_type: string;
          sort_order: number;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          description?: string | null;
          hiring_request_id: string;
          id?: string;
          label: string;
          requirement_type: string;
          sort_order?: number;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          description?: string | null;
          hiring_request_id?: string;
          id?: string;
          label?: string;
          requirement_type?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "hiring_request_requirements_agency_id_hiring_request_id_fkey";
            columns: ["agency_id", "hiring_request_id"];
            isOneToOne: false;
            referencedRelation: "hiring_requests";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      hiring_request_revisions: {
        Row: {
          agency_id: string;
          created_at: string;
          created_by: string;
          hiring_request_id: string;
          id: string;
          revision_number: number;
          snapshot: Json;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          created_by: string;
          hiring_request_id: string;
          id?: string;
          revision_number: number;
          snapshot: Json;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          created_by?: string;
          hiring_request_id?: string;
          id?: string;
          revision_number?: number;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "hiring_request_revisions_agency_id_hiring_request_id_fkey";
            columns: ["agency_id", "hiring_request_id"];
            isOneToOne: false;
            referencedRelation: "hiring_requests";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      hiring_requests: {
        Row: {
          additional_instructions: string | null;
          agency_id: string;
          approved_revision_id: string | null;
          assigned_manager_id: string | null;
          client_id: string;
          created_at: string;
          currency: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          reviewed_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          status: string;
          submitted_at: string | null;
          submitted_by: string | null;
          target_hire_date: string | null;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
        };
        Insert: {
          additional_instructions?: string | null;
          agency_id: string;
          approved_revision_id?: string | null;
          assigned_manager_id?: string | null;
          client_id: string;
          created_at?: string;
          currency?: string | null;
          department?: string | null;
          description?: string;
          employment_type?: string | null;
          id?: string;
          location?: string | null;
          positions_required?: number;
          reviewed_at?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          status?: string;
          submitted_at?: string | null;
          submitted_by?: string | null;
          target_hire_date?: string | null;
          title: string;
          updated_at?: string;
          work_arrangement?: string | null;
        };
        Update: {
          additional_instructions?: string | null;
          agency_id?: string;
          approved_revision_id?: string | null;
          assigned_manager_id?: string | null;
          client_id?: string;
          created_at?: string;
          currency?: string | null;
          department?: string | null;
          description?: string;
          employment_type?: string | null;
          id?: string;
          location?: string | null;
          positions_required?: number;
          reviewed_at?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          status?: string;
          submitted_at?: string | null;
          submitted_by?: string | null;
          target_hire_date?: string | null;
          title?: string;
          updated_at?: string;
          work_arrangement?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hiring_requests_agency_id_client_id_fkey";
            columns: ["agency_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "hiring_requests_approved_revision_fk";
            columns: ["id", "approved_revision_id"];
            isOneToOne: false;
            referencedRelation: "hiring_request_revisions";
            referencedColumns: ["hiring_request_id", "id"];
          },
        ];
      };
      job_application_questions: {
        Row: {
          agency_id: string;
          created_at: string;
          help_text: string | null;
          id: string;
          is_required: boolean;
          job_id: string;
          label: string;
          options: Json;
          question_type: string;
          sort_order: number;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          help_text?: string | null;
          id?: string;
          is_required?: boolean;
          job_id: string;
          label: string;
          options?: Json;
          question_type?: string;
          sort_order?: number;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          help_text?: string | null;
          id?: string;
          is_required?: boolean;
          job_id?: string;
          label?: string;
          options?: Json;
          question_type?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "job_application_questions_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      job_assignments: {
        Row: {
          agency_id: string;
          assignment_role: string;
          created_at: string;
          id: string;
          job_id: string;
          user_id: string;
        };
        Insert: {
          agency_id: string;
          assignment_role: string;
          created_at?: string;
          id?: string;
          job_id: string;
          user_id: string;
        };
        Update: {
          agency_id?: string;
          assignment_role?: string;
          created_at?: string;
          id?: string;
          job_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_assignments_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      job_requirements: {
        Row: {
          agency_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_required: boolean;
          job_id: string;
          label: string;
          requirement_type: string;
          sort_order: number;
          version: number;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_required: boolean;
          job_id: string;
          label: string;
          requirement_type: string;
          sort_order?: number;
          version?: number;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_required?: boolean;
          job_id?: string;
          label?: string;
          requirement_type?: string;
          sort_order?: number;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "job_requirements_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      job_workflow_stages: {
        Row: {
          agency_id: string;
          created_at: string;
          id: string;
          job_id: string;
          name: string;
          requires_approval: boolean;
          sort_order: number;
          stage_type: string;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          id?: string;
          job_id: string;
          name: string;
          requires_approval?: boolean;
          sort_order: number;
          stage_type: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          id?: string;
          job_id?: string;
          name?: string;
          requires_approval?: boolean;
          sort_order?: number;
          stage_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_workflow_stages_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      jobs: {
        Row: {
          accepting_applications: boolean;
          agency_id: string;
          application_form_intro: string | null;
          client_id: string;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
        };
        Insert: {
          accepting_applications?: boolean;
          agency_id: string;
          application_form_intro?: string | null;
          client_id: string;
          created_at?: string;
          created_by: string;
          creation_request_id?: string | null;
          currency?: string | null;
          deadline_at?: string | null;
          department?: string | null;
          description?: string;
          employment_type?: string | null;
          hiring_request_id?: string | null;
          id?: string;
          location?: string | null;
          positions_required: number;
          primary_recruiter_id?: string | null;
          priority?: string;
          public_slug?: string | null;
          published_at?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          source?: string;
          source_revision_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          work_arrangement?: string | null;
          workflow_template_id?: string | null;
        };
        Update: {
          accepting_applications?: boolean;
          agency_id?: string;
          application_form_intro?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string;
          creation_request_id?: string | null;
          currency?: string | null;
          deadline_at?: string | null;
          department?: string | null;
          description?: string;
          employment_type?: string | null;
          hiring_request_id?: string | null;
          id?: string;
          location?: string | null;
          positions_required?: number;
          primary_recruiter_id?: string | null;
          priority?: string;
          public_slug?: string | null;
          published_at?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          source?: string;
          source_revision_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          work_arrangement?: string | null;
          workflow_template_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_agency_id_client_id_fkey";
            columns: ["agency_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "jobs_agency_id_hiring_request_id_fkey";
            columns: ["agency_id", "hiring_request_id"];
            isOneToOne: false;
            referencedRelation: "hiring_requests";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "jobs_agency_id_workflow_template_id_fkey";
            columns: ["agency_id", "workflow_template_id"];
            isOneToOne: false;
            referencedRelation: "workflow_templates";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "jobs_hiring_request_id_source_revision_id_fkey";
            columns: ["hiring_request_id", "source_revision_id"];
            isOneToOne: false;
            referencedRelation: "hiring_request_revisions";
            referencedColumns: ["hiring_request_id", "id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_stages: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          requires_approval: boolean;
          sort_order: number;
          stage_type: string;
          workflow_template_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          requires_approval?: boolean;
          sort_order: number;
          stage_type: string;
          workflow_template_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          requires_approval?: boolean;
          sort_order?: number;
          stage_type?: string;
          workflow_template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_stages_workflow_template_id_fkey";
            columns: ["workflow_template_id"];
            isOneToOne: false;
            referencedRelation: "workflow_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_templates: {
        Row: {
          agency_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          is_system_template: boolean;
          name: string;
          template_key: string | null;
        };
        Insert: {
          agency_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_system_template?: boolean;
          name: string;
          template_key?: string | null;
        };
        Update: {
          agency_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_system_template?: boolean;
          name?: string;
          template_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_templates_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_agency_invitation: {
        Args: { p_token_hash: string };
        Returns: {
          agency_id: string;
          created_at: string;
          id: string;
          joined_at: string | null;
          role: string;
          status: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "agency_memberships";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      accept_client_invitation: {
        Args: { p_token_hash: string };
        Returns: {
          agency_id: string;
          client_id: string;
          created_at: string;
          id: string;
          role: string;
          status: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "client_memberships";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      approve_hiring_request: {
        Args: { p_request_id: string; p_request_id_header?: string };
        Returns: {
          additional_instructions: string | null;
          agency_id: string;
          approved_revision_id: string | null;
          assigned_manager_id: string | null;
          client_id: string;
          created_at: string;
          currency: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          reviewed_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          status: string;
          submitted_at: string | null;
          submitted_by: string | null;
          target_hire_date: string | null;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "hiring_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      assign_job: {
        Args: {
          p_assignment_role: string;
          p_job_id: string;
          p_request_id_header?: string;
          p_user_id: string;
        };
        Returns: {
          agency_id: string;
          assignment_role: string;
          created_at: string;
          id: string;
          job_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "job_assignments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      convert_hiring_request_to_job: {
        Args: {
          p_deadline_at: string;
          p_idempotency_key: string;
          p_primary_recruiter_id: string;
          p_priority: string;
          p_request_id: string;
          p_workflow_template_id: string;
        };
        Returns: string;
      };
      create_manual_job: {
        Args: {
          p_agency_id: string;
          p_client_id: string;
          p_job: Json;
          p_new_client: Json;
          p_publish?: boolean;
          p_questions?: Json;
          p_request_id_header?: string;
          p_requirements?: Json;
        };
        Returns: string;
      };
      delete_empty_client: {
        Args: { p_client_id: string; p_request_id_header?: string };
        Returns: string;
      };
      delete_empty_manual_job: {
        Args: { p_job_id: string; p_request_id_header?: string };
        Returns: Json;
      };
      onboard_agency: {
        Args: {
          p_contact_email: string;
          p_country_code: string;
          p_full_name: string;
          p_name: string;
          p_primary_specialization?: string;
          p_slug: string;
          p_timezone: string;
        };
        Returns: string;
      };
      publish_job: {
        Args: {
          p_job_id: string;
          p_public_slug: string;
          p_request_id_header?: string;
        };
        Returns: {
          accepting_applications: boolean;
          agency_id: string;
          application_form_intro: string | null;
          client_id: string;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_hiring_request_clarification: {
        Args: {
          p_message: string;
          p_request_id: string;
          p_request_id_header?: string;
        };
        Returns: {
          additional_instructions: string | null;
          agency_id: string;
          approved_revision_id: string | null;
          assigned_manager_id: string | null;
          client_id: string;
          created_at: string;
          currency: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          reviewed_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          status: string;
          submitted_at: string | null;
          submitted_by: string | null;
          target_hire_date: string | null;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "hiring_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_hiring_request: {
        Args: { p_request_id: string; p_request_id_header?: string };
        Returns: {
          additional_instructions: string | null;
          agency_id: string;
          approved_revision_id: string | null;
          assigned_manager_id: string | null;
          client_id: string;
          created_at: string;
          currency: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          reviewed_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          status: string;
          submitted_at: string | null;
          submitted_by: string | null;
          target_hire_date: string | null;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "hiring_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_public_application: {
        Args: {
          p_agency_id: string;
          p_answers?: Json;
          p_application_id: string;
          p_cover_note: string | null;
          p_document: Json;
          p_email: string;
          p_full_name: string;
          p_job_id: string;
          p_linkedin_url: string | null;
          p_phone: string | null;
        };
        Returns: Json;
      };
      transition_hiring_request: {
        Args: {
          p_action: string;
          p_request_id: string;
          p_request_id_header?: string;
        };
        Returns: {
          additional_instructions: string | null;
          agency_id: string;
          approved_revision_id: string | null;
          assigned_manager_id: string | null;
          client_id: string;
          created_at: string;
          currency: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          reviewed_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          status: string;
          submitted_at: string | null;
          submitted_by: string | null;
          target_hire_date: string | null;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "hiring_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_job: {
        Args: {
          p_job_id: string;
          p_request_id_header?: string;
          p_status: string;
        };
        Returns: {
          accepting_applications: boolean;
          agency_id: string;
          application_form_intro: string | null;
          client_id: string;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_type: string | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          salary_max: number | null;
          salary_min: number | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
