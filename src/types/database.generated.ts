export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
          metadata: NonNullable<Json>;
          request_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          agency_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          metadata?: NonNullable<Json>;
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
          metadata?: NonNullable<Json>;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
      agency_processing_settings: {
        Row: {
          acknowledge_applications: boolean;
          agency_id: string;
          automatic_screening: boolean;
          review_reminder_hours: number;
          screening_enabled: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          acknowledge_applications?: boolean;
          agency_id: string;
          automatic_screening?: boolean;
          review_reminder_hours?: number;
          screening_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          acknowledge_applications?: boolean;
          agency_id?: string;
          automatic_screening?: boolean;
          review_reminder_hours?: number;
          screening_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agency_processing_settings_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: true;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      application_answers: {
        Row: {
          agency_id: string;
          answer: NonNullable<Json>;
          application_id: string;
          created_at: string;
          id: string;
          job_id: string;
          question_id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          answer: NonNullable<Json>;
          application_id: string;
          created_at?: string;
          id?: string;
          job_id: string;
          question_id: string;
        };
        Update: {
          agency_id?: string;
          answer?: NonNullable<Json>;
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
      application_intake_tasks: {
        Row: {
          agency_id: string;
          application_id: string;
          attempts: number;
          available_at: string;
          created_at: string;
          failure_code: string | null;
          id: string;
          lease_token: string | null;
          lease_until: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          application_id: string;
          attempts?: number;
          available_at?: string;
          created_at?: string;
          failure_code?: string | null;
          id?: string;
          lease_token?: string | null;
          lease_until?: string | null;
          status?: string;
        };
        Update: {
          agency_id?: string;
          application_id?: string;
          attempts?: number;
          available_at?: string;
          created_at?: string;
          failure_code?: string | null;
          id?: string;
          lease_token?: string | null;
          lease_until?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_intake_tasks_agency_id_application_id_fkey";
            columns: ["agency_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      application_notes: {
        Row: {
          agency_id: string;
          application_id: string;
          author_user_id: string | null;
          body: string;
          created_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          application_id: string;
          author_user_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          agency_id?: string;
          application_id?: string;
          author_user_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_notes_agency_id_application_id_fkey";
            columns: ["agency_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "id"];
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
          intake_payload_hash: string | null;
          job_id: string;
          owner_user_id: string | null;
          processing_status: string;
          source: string;
          status: string;
          submitted_at: string;
          submitted_profile: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          candidate_id: string;
          cover_note?: string | null;
          created_at?: string;
          id?: string;
          intake_payload_hash?: string | null;
          job_id: string;
          owner_user_id?: string | null;
          processing_status?: string;
          source?: string;
          status?: string;
          submitted_at?: string;
          submitted_profile?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          candidate_id?: string;
          cover_note?: string | null;
          created_at?: string;
          id?: string;
          intake_payload_hash?: string | null;
          job_id?: string;
          owner_user_id?: string | null;
          processing_status?: string;
          source?: string;
          status?: string;
          submitted_at?: string;
          submitted_profile?: NonNullable<Json>;
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
          {
            foreignKeyName: "applications_owner_membership_fk";
            columns: ["agency_id", "owner_user_id"];
            isOneToOne: false;
            referencedRelation: "agency_memberships";
            referencedColumns: ["agency_id", "user_id"];
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
        ComputedFields: never;
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
      candidate_submissions: {
        Row: {
          agency_id: string;
          application_id: string;
          candidate_name: string;
          document_id: string | null;
          id: string;
          job_id: string;
          shared_at: string;
          shared_by: string;
          summary: string;
          withdrawn_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          application_id: string;
          candidate_name: string;
          document_id?: string | null;
          id?: string;
          job_id: string;
          shared_at?: string;
          shared_by: string;
          summary: string;
          withdrawn_at?: string | null;
        };
        Update: {
          agency_id?: string;
          application_id?: string;
          candidate_name?: string;
          document_id?: string | null;
          id?: string;
          job_id?: string;
          shared_at?: string;
          shared_by?: string;
          summary?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_submissions_agency_id_job_id_application_id_fkey";
            columns: ["agency_id", "job_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "job_id", "id"];
          },
          {
            foreignKeyName: "candidate_submissions_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "candidate_submissions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "candidate_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          agency_id: string;
          created_at: string;
          email: string;
          email_normalized: string | null;
          email_suppressed: boolean;
          full_name: string;
          id: string;
          linkedin_url: string | null;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          email: string;
          email_normalized?: never;
          email_suppressed?: boolean;
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
          email_normalized?: never;
          email_suppressed?: boolean;
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
        ComputedFields: never;
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
          job_id: string | null;
          revoked_at: string | null;
          role: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          agency_id: string;
          client_id: string;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          job_id?: string | null;
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
          job_id?: string | null;
          revoked_at?: string | null;
          role?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_invitation_job_fk";
            columns: ["client_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["client_id", "id"];
          },
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
        ComputedFields: never;
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
        ComputedFields: never;
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
          company_profile: NonNullable<Json>;
          country_code: string | null;
          created_at: string;
          creation_request_id: string | null;
          id: string;
          industry: string | null;
          internal_notes: string | null;
          location: string | null;
          name: string;
          status: string;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_manager_id?: string | null;
          agency_id: string;
          company_profile?: NonNullable<Json>;
          country_code?: string | null;
          created_at?: string;
          creation_request_id?: string | null;
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
          company_profile?: NonNullable<Json>;
          country_code?: string | null;
          created_at?: string;
          creation_request_id?: string | null;
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
          application_id: string | null;
          attempt_count: number;
          available_at: string;
          body: string | null;
          created_at: string;
          delivered_at: string | null;
          failure_code: string | null;
          id: string;
          idempotency_key: string;
          last_error: string | null;
          lease_token: string | null;
          lease_until: string | null;
          message_type: string;
          provider_event_at: string | null;
          provider_message_id: string | null;
          recipient_email: string;
          related_entity_id: string | null;
          related_entity_type: string | null;
          reply_to: string | null;
          sender_user_id: string | null;
          sent_at: string | null;
          status: string;
          subject: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          application_id?: string | null;
          attempt_count?: number;
          available_at?: string;
          body?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          failure_code?: string | null;
          id?: string;
          idempotency_key: string;
          last_error?: string | null;
          lease_token?: string | null;
          lease_until?: string | null;
          message_type: string;
          provider_event_at?: string | null;
          provider_message_id?: string | null;
          recipient_email: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          reply_to?: string | null;
          sender_user_id?: string | null;
          sent_at?: string | null;
          status?: string;
          subject?: string | null;
        };
        Update: {
          agency_id?: string;
          application_id?: string | null;
          attempt_count?: number;
          available_at?: string;
          body?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          failure_code?: string | null;
          id?: string;
          idempotency_key?: string;
          last_error?: string | null;
          lease_token?: string | null;
          lease_until?: string | null;
          message_type?: string;
          provider_event_at?: string | null;
          provider_message_id?: string | null;
          recipient_email?: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          reply_to?: string | null;
          sender_user_id?: string | null;
          sent_at?: string | null;
          status?: string;
          subject?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "communications_agency_id_application_id_fkey";
            columns: ["agency_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "id"];
          },
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
        ComputedFields: never;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
          snapshot: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          created_by: string;
          hiring_request_id: string;
          id?: string;
          revision_number: number;
          snapshot: NonNullable<Json>;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          created_by?: string;
          hiring_request_id?: string;
          id?: string;
          revision_number?: number;
          snapshot?: NonNullable<Json>;
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
        ComputedFields: never;
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
          options: NonNullable<Json>;
          question_type: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          created_at?: string;
          help_text?: string | null;
          id?: string;
          is_required?: boolean;
          job_id: string;
          label: string;
          options?: NonNullable<Json>;
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
          options?: NonNullable<Json>;
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
        ComputedFields: never;
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
      job_draft_content: {
        Row: {
          agency_id: string;
          job_id: string;
          questions: NonNullable<Json>;
          requirements: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          job_id: string;
          questions?: NonNullable<Json>;
          requirements?: NonNullable<Json>;
        };
        Update: {
          agency_id?: string;
          job_id?: string;
          questions?: NonNullable<Json>;
          requirements?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "job_draft_content_agency_id_job_id_fkey";
            columns: ["agency_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      job_internal_briefs: {
        Row: {
          agency_id: string;
          currency: string | null;
          hiring_reason: string | null;
          job_id: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string | null;
          sourcing_brief: string | null;
          target_start_date: string | null;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          currency?: string | null;
          hiring_reason?: string | null;
          job_id: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string | null;
          sourcing_brief?: string | null;
          target_start_date?: string | null;
        };
        Update: {
          agency_id?: string;
          currency?: string | null;
          hiring_reason?: string | null;
          job_id?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string | null;
          sourcing_brief?: string | null;
          target_start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_internal_briefs_agency_id_job_id_fkey";
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
        ComputedFields: never;
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
        ComputedFields: never;
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
          content_version: number;
          contract_duration: string | null;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_arrangement: string | null;
          employment_type: string | null;
          experience_min_years: number | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          remote_details: string | null;
          remote_eligibility: string | null;
          salary_basis: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string | null;
          salary_visibility: string;
          seniority_level: string | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
          working_hours: string;
        };
        ComputedFields: never;
        Insert: {
          accepting_applications?: boolean;
          agency_id: string;
          application_form_intro?: string | null;
          client_id: string;
          content_version?: number;
          contract_duration?: string | null;
          created_at?: string;
          created_by: string;
          creation_request_id?: string | null;
          currency?: string | null;
          deadline_at?: string | null;
          department?: string | null;
          description?: string;
          employment_arrangement?: string | null;
          employment_type?: string | null;
          experience_min_years?: number | null;
          hiring_request_id?: string | null;
          id?: string;
          location?: string | null;
          positions_required: number;
          primary_recruiter_id?: string | null;
          priority?: string;
          public_slug?: string | null;
          published_at?: string | null;
          remote_details?: string | null;
          remote_eligibility?: string | null;
          salary_basis?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string | null;
          salary_visibility?: string;
          seniority_level?: string | null;
          source?: string;
          source_revision_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          work_arrangement?: string | null;
          workflow_template_id?: string | null;
          working_hours?: string;
        };
        Update: {
          accepting_applications?: boolean;
          agency_id?: string;
          application_form_intro?: string | null;
          client_id?: string;
          content_version?: number;
          contract_duration?: string | null;
          created_at?: string;
          created_by?: string;
          creation_request_id?: string | null;
          currency?: string | null;
          deadline_at?: string | null;
          department?: string | null;
          description?: string;
          employment_arrangement?: string | null;
          employment_type?: string | null;
          experience_min_years?: number | null;
          hiring_request_id?: string | null;
          id?: string;
          location?: string | null;
          positions_required?: number;
          primary_recruiter_id?: string | null;
          priority?: string;
          public_slug?: string | null;
          published_at?: string | null;
          remote_details?: string | null;
          remote_eligibility?: string | null;
          salary_basis?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string | null;
          salary_visibility?: string;
          seniority_level?: string | null;
          source?: string;
          source_revision_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          work_arrangement?: string | null;
          workflow_template_id?: string | null;
          working_hours?: string;
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
      screening_corrections: {
        Row: {
          agency_id: string;
          application_id: string;
          author_user_id: string | null;
          created_at: string;
          explanation: string;
          id: string;
          requirement_id: string;
          run_id: string;
          verdict: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          application_id: string;
          author_user_id?: string | null;
          created_at?: string;
          explanation: string;
          id: string;
          requirement_id: string;
          run_id: string;
          verdict: string;
        };
        Update: {
          agency_id?: string;
          application_id?: string;
          author_user_id?: string | null;
          created_at?: string;
          explanation?: string;
          id?: string;
          requirement_id?: string;
          run_id?: string;
          verdict?: string;
        };
        Relationships: [
          {
            foreignKeyName: "screening_corrections_agency_id_application_id_fkey";
            columns: ["agency_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "id"];
          },
          {
            foreignKeyName: "screening_corrections_agency_id_run_id_fkey";
            columns: ["agency_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "screening_runs";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      screening_question_library: {
        Row: {
          agency_id: string;
          archived: boolean;
          category: string;
          help_text: string;
          id: string;
          is_required: boolean;
          label: string;
          options: NonNullable<Json>;
          question_type: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          archived?: boolean;
          category: string;
          help_text?: string;
          id: string;
          is_required?: boolean;
          label: string;
          options?: NonNullable<Json>;
          question_type: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          agency_id?: string;
          archived?: boolean;
          category?: string;
          help_text?: string;
          id?: string;
          is_required?: boolean;
          label?: string;
          options?: NonNullable<Json>;
          question_type?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "screening_question_library_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
        ];
      };
      screening_runs: {
        Row: {
          agency_id: string;
          application_id: string;
          assessment: Json | null;
          attempts: number;
          available_at: string;
          created_at: string;
          document_id: string;
          extraction: Json | null;
          extractor_version: string;
          failure_code: string | null;
          finished_at: string | null;
          id: string;
          idempotency_key: string;
          input_fingerprint: string;
          input_snapshot: NonNullable<Json>;
          lease_token: string | null;
          lease_until: string | null;
          model: string;
          prompt_version: string;
          provider_metadata: Json | null;
          request_id: string;
          requested_by: string | null;
          started_at: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          application_id: string;
          assessment?: Json | null;
          attempts?: number;
          available_at?: string;
          created_at?: string;
          document_id: string;
          extraction?: Json | null;
          extractor_version: string;
          failure_code?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key: string;
          input_fingerprint: string;
          input_snapshot: NonNullable<Json>;
          lease_token?: string | null;
          lease_until?: string | null;
          model: string;
          prompt_version: string;
          provider_metadata?: Json | null;
          request_id: string;
          requested_by?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          agency_id?: string;
          application_id?: string;
          assessment?: Json | null;
          attempts?: number;
          available_at?: string;
          created_at?: string;
          document_id?: string;
          extraction?: Json | null;
          extractor_version?: string;
          failure_code?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string;
          input_fingerprint?: string;
          input_snapshot?: NonNullable<Json>;
          lease_token?: string | null;
          lease_until?: string | null;
          model?: string;
          prompt_version?: string;
          provider_metadata?: Json | null;
          request_id?: string;
          requested_by?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "screening_runs_agency_id_application_id_document_id_fkey";
            columns: ["agency_id", "application_id", "document_id"];
            isOneToOne: false;
            referencedRelation: "candidate_documents";
            referencedColumns: ["agency_id", "application_id", "id"];
          },
          {
            foreignKeyName: "screening_runs_agency_id_application_id_fkey";
            columns: ["agency_id", "application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["agency_id", "id"];
          },
        ];
      };
      submission_feedback: {
        Row: {
          agency_id: string;
          author_user_id: string;
          comment: string;
          concerns: string;
          created_at: string;
          id: string;
          recommendation: string;
          strengths: string;
          submission_id: string;
        };
        ComputedFields: never;
        Insert: {
          agency_id: string;
          author_user_id: string;
          comment: string;
          concerns?: string;
          created_at?: string;
          id: string;
          recommendation: string;
          strengths?: string;
          submission_id: string;
        };
        Update: {
          agency_id?: string;
          author_user_id?: string;
          comment?: string;
          concerns?: string;
          created_at?: string;
          id?: string;
          recommendation?: string;
          strengths?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_feedback_agency_id_submission_id_fkey";
            columns: ["agency_id", "submission_id"];
            isOneToOne: false;
            referencedRelation: "candidate_submissions";
            referencedColumns: ["agency_id", "id"];
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
        ComputedFields: never;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
      application_inbox: {
        Args: { p_agency_id: string; p_filters?: Json };
        Returns: Json;
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
      cancel_candidate_message: {
        Args: { p_agency_id: string; p_id: string; p_request_id: string };
        Returns: undefined;
      };
      checkpoint_screening_extraction: {
        Args: {
          p_extraction: Json;
          p_id: string;
          p_lease: string;
          p_metadata: Json;
        };
        Returns: boolean;
      };
      claim_application_intake: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agency_id: string;
          application_id: string;
          attempts: number;
          available_at: string;
          created_at: string;
          failure_code: string | null;
          id: string;
          lease_token: string | null;
          lease_until: string | null;
          status: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "application_intake_tasks";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_candidate_message: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agency_id: string;
          application_id: string | null;
          attempt_count: number;
          available_at: string;
          body: string | null;
          created_at: string;
          delivered_at: string | null;
          failure_code: string | null;
          id: string;
          idempotency_key: string;
          last_error: string | null;
          lease_token: string | null;
          lease_until: string | null;
          message_type: string;
          provider_event_at: string | null;
          provider_message_id: string | null;
          recipient_email: string;
          related_entity_id: string | null;
          related_entity_type: string | null;
          reply_to: string | null;
          sender_user_id: string | null;
          sent_at: string | null;
          status: string;
          subject: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "communications";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_screening_run: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agency_id: string;
          application_id: string;
          assessment: Json | null;
          attempts: number;
          available_at: string;
          created_at: string;
          document_id: string;
          extraction: Json | null;
          extractor_version: string;
          failure_code: string | null;
          finished_at: string | null;
          id: string;
          idempotency_key: string;
          input_fingerprint: string;
          input_snapshot: NonNullable<Json>;
          lease_token: string | null;
          lease_until: string | null;
          model: string;
          prompt_version: string;
          provider_metadata: Json | null;
          request_id: string;
          requested_by: string | null;
          started_at: string | null;
          status: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "screening_runs";
          isOneToOne: false;
          isSetofReturn: true;
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
      correct_screening: {
        Args: {
          p_agency_id: string;
          p_application_id: string;
          p_payload: Json;
          p_request_id: string;
        };
        Returns: undefined;
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
      create_organization: {
        Args: {
          p_agency_id: string;
          p_contact?: Json;
          p_organization: Json;
          p_request_id_header?: string;
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
      fail_application_intake: {
        Args: { p_id: string; p_lease: string };
        Returns: undefined;
      };
      finish_candidate_message: {
        Args: {
          p_failure: string;
          p_id: string;
          p_lease: string;
          p_provider_id: string;
          p_retryable: boolean;
        };
        Returns: boolean;
      };
      finish_screening_run: {
        Args: {
          p_failure_code: string;
          p_id: string;
          p_lease: string;
          p_result: Json;
          p_retryable: boolean;
        };
        Returns: boolean;
      };
      job_collaborator_directory: {
        Args: { p_agency_id: string; p_job_id: string };
        Returns: {
          email: string;
          has_access: boolean;
          name: string;
          role: string;
          user_id: string;
        }[];
      };
      manage_job_collaborator: {
        Args: {
          p_action: string;
          p_agency_id: string;
          p_job_id: string;
          p_request_id: string;
          p_user_id: string;
        };
        Returns: undefined;
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
      portal_memberships: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agency_id: string;
          agency_name: string;
          client_id: string;
          client_name: string;
          role: string;
        }[];
      };
      prepare_application_intake: {
        Args: { p_id: string; p_lease: string; p_model: string };
        Returns: Json;
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
          content_version: number;
          contract_duration: string | null;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_arrangement: string | null;
          employment_type: string | null;
          experience_min_years: number | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          remote_details: string | null;
          remote_eligibility: string | null;
          salary_basis: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string | null;
          salary_visibility: string;
          seniority_level: string | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
          working_hours: string;
        };
        SetofOptions: {
          from: "*";
          to: "jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      queue_candidate_message: {
        Args: {
          p_agency_id: string;
          p_application_id: string;
          p_key: string;
          p_payload: Json;
          p_request_id: string;
        };
        Returns: string;
      };
      record_email_event: {
        Args: {
          p_at: string;
          p_event_id: string;
          p_provider_id: string;
          p_status: string;
          p_suppress?: boolean;
        };
        Returns: boolean;
      };
      request_application_screening: {
        Args: {
          p_agency_id: string;
          p_application_id: string;
          p_document_id: string;
          p_key: string;
          p_model: string;
          p_request_id: string;
        };
        Returns: Json;
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
      reserve_public_intake: {
        Args: { p_fingerprint: string; p_job_id: string };
        Returns: boolean;
      };
      retry_application_intake: {
        Args: { p_agency_id: string; p_application_id: string };
        Returns: undefined;
      };
      retry_candidate_message: {
        Args: { p_agency_id: string; p_id: string; p_request_id: string };
        Returns: undefined;
      };
      review_application: {
        Args: {
          p_action: string;
          p_agency_id: string;
          p_application_id: string;
          p_expected_updated_at?: string;
          p_payload: Json;
          p_request_id?: string;
        };
        Returns: {
          agency_id: string;
          candidate_id: string;
          cover_note: string | null;
          created_at: string;
          id: string;
          intake_payload_hash: string | null;
          job_id: string;
          owner_user_id: string | null;
          processing_status: string;
          source: string;
          status: string;
          submitted_at: string;
          submitted_profile: NonNullable<Json>;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "applications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_client_request: {
        Args: {
          p_client_id: string;
          p_expected_updated_at?: string;
          p_id: string;
          p_payload: Json;
        };
        Returns: Json;
      };
      save_library_question: {
        Args: { p_agency_id: string; p_input: Json; p_request_key: string };
        Returns: {
          agency_id: string;
          archived: boolean;
          category: string;
          help_text: string;
          id: string;
          is_required: boolean;
          label: string;
          options: NonNullable<Json>;
          question_type: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "screening_question_library";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_processing_settings: {
        Args: { p_agency_id: string; p_request_id: string; p_settings: Json };
        Returns: undefined;
      };
      screening_evidence_context: {
        Args: { p_agency_id: string; p_application_id: string };
        Returns: Json;
      };
      share_candidate: {
        Args: {
          p_agency_id: string;
          p_application_id: string;
          p_document_id?: string;
          p_expected_submission_id?: string;
          p_request_id: string;
          p_summary: string;
          p_withdraw: boolean;
        };
        Returns: string;
      };
      submit_candidate_feedback: {
        Args: {
          p_feedback_id: string;
          p_payload: Json;
          p_request_id: string;
          p_submission_id: string;
        };
        Returns: string;
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
          p_cover_note: string;
          p_document: Json;
          p_email: string;
          p_full_name: string;
          p_job_id: string;
          p_linkedin_url: string;
          p_phone: string;
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
          content_version: number;
          contract_duration: string | null;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_arrangement: string | null;
          employment_type: string | null;
          experience_min_years: number | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          remote_details: string | null;
          remote_eligibility: string | null;
          salary_basis: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string | null;
          salary_visibility: string;
          seniority_level: string | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
          working_hours: string;
        };
        SetofOptions: {
          from: "*";
          to: "jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_agency_logo: {
        Args: {
          p_agency_id: string;
          p_expected_logo_path: string;
          p_logo_path: string;
          p_request_id: string;
        };
        Returns: undefined;
      };
      update_draft_job: {
        Args: {
          p_agency_id: string;
          p_client_id: string;
          p_expected_updated_at: string;
          p_job: Json;
          p_job_id: string;
          p_new_client: Json;
          p_questions: Json;
          p_request_id_header?: string;
          p_requirements: Json;
        };
        Returns: {
          accepting_applications: boolean;
          agency_id: string;
          application_form_intro: string | null;
          client_id: string;
          content_version: number;
          contract_duration: string | null;
          created_at: string;
          created_by: string;
          creation_request_id: string | null;
          currency: string | null;
          deadline_at: string | null;
          department: string | null;
          description: string;
          employment_arrangement: string | null;
          employment_type: string | null;
          experience_min_years: number | null;
          hiring_request_id: string | null;
          id: string;
          location: string | null;
          positions_required: number;
          primary_recruiter_id: string | null;
          priority: string;
          public_slug: string | null;
          published_at: string | null;
          remote_details: string | null;
          remote_eligibility: string | null;
          salary_basis: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string | null;
          salary_visibility: string;
          seniority_level: string | null;
          source: string;
          source_revision_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          work_arrangement: string | null;
          workflow_template_id: string | null;
          working_hours: string;
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
