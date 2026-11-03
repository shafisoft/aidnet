export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  donate: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      campaign_beneficiary: {
        Row: {
          campaign_id: string
          created_at: string | null
          document_url: string | null
          full_name: string
          id: string
          national_id: string | null
          notes: string | null
          phone: string | null
          relationship: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          campaign_id: string
          created_at?: string | null
          document_url?: string | null
          full_name: string
          id?: string
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          document_url?: string | null
          full_name?: string
          id?: string
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_beneficiary_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: true
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      campaign_payment_methods: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bkash_account_name: string | null
          bkash_number: string | null
          campaign_id: string
          created_at: string | null
          donation_url: string | null
          id: string
          instructions: string | null
          is_preferred: boolean | null
          nagad_account_name: string | null
          nagad_number: string | null
          qr_image_url: string | null
          rocket_account_name: string | null
          rocket_number: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bkash_account_name?: string | null
          bkash_number?: string | null
          campaign_id: string
          created_at?: string | null
          donation_url?: string | null
          id?: string
          instructions?: string | null
          is_preferred?: boolean | null
          nagad_account_name?: string | null
          nagad_number?: string | null
          qr_image_url?: string | null
          rocket_account_name?: string | null
          rocket_number?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bkash_account_name?: string | null
          bkash_number?: string | null
          campaign_id?: string
          created_at?: string | null
          donation_url?: string | null
          id?: string
          instructions?: string | null
          is_preferred?: boolean | null
          nagad_account_name?: string | null
          nagad_number?: string | null
          qr_image_url?: string | null
          rocket_account_name?: string | null
          rocket_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_payment_methods_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: true
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      campaign_tag_map: {
        Row: {
          campaign_id: string
          created_at: string | null
          tag_id: string
        }
        ComputedFields: never
        Insert: {
          campaign_id: string
          created_at?: string | null
          tag_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_tag_map_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaign_tag_map_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'campaign_tags'
            referencedColumns: ['id']
          },
        ]
      }
      campaign_tags: {
        Row: {
          id: string
          label: string
          label_bn: string | null
          slug: string
        }
        ComputedFields: never
        Insert: {
          id?: string
          label: string
          label_bn?: string | null
          slug: string
        }
        Update: {
          id?: string
          label?: string
          label_bn?: string | null
          slug?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        ComputedFields: never
        Insert: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string
          is_active?: boolean | null
          is_zakat_eligible?: boolean | null
          org_id: string
          raised_amount?: number
          slug: string
          start_date?: string | null
          status?: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string
          is_active?: boolean | null
          is_zakat_eligible?: boolean | null
          org_id?: string
          raised_amount?: number
          slug?: string
          start_date?: string | null
          status?: Database['donate']['Enums']['campaign_status'] | null
          title?: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'campaigns_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      donation_methods: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bkash_account_name: string | null
          bkash_number: string | null
          created_at: string | null
          donation_url: string | null
          id: string
          instructions: string | null
          is_preferred: boolean | null
          nagad_account_name: string | null
          nagad_number: string | null
          organization_id: string
          qr_image_url: string | null
          rocket_account_name: string | null
          rocket_number: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bkash_account_name?: string | null
          bkash_number?: string | null
          created_at?: string | null
          donation_url?: string | null
          id?: string
          instructions?: string | null
          is_preferred?: boolean | null
          nagad_account_name?: string | null
          nagad_number?: string | null
          organization_id: string
          qr_image_url?: string | null
          rocket_account_name?: string | null
          rocket_number?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bkash_account_name?: string | null
          bkash_number?: string | null
          created_at?: string | null
          donation_url?: string | null
          id?: string
          instructions?: string | null
          is_preferred?: boolean | null
          nagad_account_name?: string | null
          nagad_number?: string | null
          organization_id?: string
          qr_image_url?: string | null
          rocket_account_name?: string | null
          rocket_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'donation_methods_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_methods_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_methods_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      donation_reports: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string | null
          currency: string
          donor_name: string | null
          id: string
          message: string | null
          method: string
          org_id: string
          reference: string | null
          reporter_ip_hash: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string | null
          currency: string
          donor_name?: string | null
          id?: string
          message?: string | null
          method?: string
          org_id: string
          reference?: string | null
          reporter_ip_hash?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string | null
          currency?: string
          donor_name?: string | null
          id?: string
          message?: string | null
          method?: string
          org_id?: string
          reference?: string | null
          reporter_ip_hash?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'donation_reports_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_reports_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_reports_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_reports_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_reports_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: string | null
          token: string
        }
        ComputedFields: never
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      org_meta: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          description: string | null
          logo_url: string | null
          name: string
          organization_id: string
          settings: Json | null
          social_links: Json | null
          updated_at: string | null
          updated_by: string | null
          website_url: string | null
        }
        ComputedFields: never
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          description?: string | null
          logo_url?: string | null
          name: string
          organization_id: string
          settings?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          description?: string | null
          logo_url?: string | null
          name?: string
          organization_id?: string
          settings?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'org_meta_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_meta_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_meta_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_meta_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      org_requests: {
        Row: {
          created_org_id: string | null
          id: string
          org_description: string | null
          org_name: string
          org_slug: string
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_org_id?: string | null
          id?: string
          org_description?: string | null
          org_name: string
          org_slug: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_org_id?: string | null
          id?: string
          org_description?: string | null
          org_name?: string
          org_slug?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_requests_created_org_id_fkey'
            columns: ['created_org_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_requests_created_org_id_fkey'
            columns: ['created_org_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_requests_created_org_id_fkey'
            columns: ['created_org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_requests_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          is_owner: boolean
          joined_at: string | null
          organization_id: string | null
          role: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_owner?: boolean
          joined_at?: string | null
          organization_id?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_owner?: boolean
          joined_at?: string | null
          organization_id?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          billing_period: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          billing_period?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'organization_subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_subscriptions_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'subscription_plans'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          kind: string
          logo_url: string | null
          name: string
          org_type: string
          settings: Json | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          logo_url?: string | null
          name: string
          org_type?: string
          settings?: Json | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          logo_url?: string | null
          name?: string
          org_type?: string
          settings?: Json | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_fkey'
            columns: ['role']
            isOneToOne: false
            referencedRelation: 'role_view'
            referencedColumns: ['name']
          },
          {
            foreignKeyName: 'role_permissions_role_fkey'
            columns: ['role']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['name']
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          action: string
          amount: number | null
          created_at: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          organization_id: string
          payment_status: string | null
          plan_id: string
        }
        ComputedFields: never
        Insert: {
          action: string
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id: string
          payment_status?: string | null
          plan_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string
          payment_status?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscription_history_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subscription_history_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subscription_history_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subscription_history_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'subscription_plans'
            referencedColumns: ['id']
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'todos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'todos_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'todos_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'todos_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      member_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_detail_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organization_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      organization_detail_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          member_count: number | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      organization_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profile_view'
            referencedColumns: ['id']
          },
        ]
      }
      profile_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_system_role: boolean | null
          name: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system_role?: boolean | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system_role?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      __probe_rest_target: { Args: Record<PropertyKey, never>; Returns: number }
      accept_invite: { Args: { p_token: string }; Returns: boolean }
      add_organization_member: {
        Args: {
          member_role?: string
          target_org_id: string
          target_user_email: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'member_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      approve_org_request: { Args: { p_request_id: string }; Returns: string }
      audit_action: {
        Args: {
          action_name: string
          audit_metadata?: Json
          audit_org_id: string
          audit_user_id: string
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: string
      }
      bootstrap_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_perform: {
        Args: { p_org_id: string; permission_name: string }
        Returns: boolean
      }
      cancel_subscription: { Args: { p_org_id: string }; Returns: boolean }
      change_plan: {
        Args: {
          p_billing_period: string
          p_new_plan_id: string
          p_org_id: string
        }
        Returns: {
          billing_period: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'organization_subscriptions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_donation_report: {
        Args: { p_report_id: string }
        Returns: boolean
      }
      create_campaign: {
        Args: {
          p_address?: string
          p_cover_image_url?: string
          p_currency?: string
          p_description?: string
          p_end_date?: string
          p_goal_amount?: number
          p_is_zakat_eligible?: boolean
          p_org_id: string
          p_slug: string
          p_start_date?: string
          p_title: string
        }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_invite: {
        Args: { p_email: string; p_organization_id: string; p_role?: string }
        Returns: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: string | null
          token: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'invites'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_organization: {
        Args: {
          org_description?: string
          org_name: string
          org_settings?: Json
          org_slug: string
        }
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'organization_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_personal_org: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      create_subscription_plan: {
        Args: {
          p_description: string
          p_features: Json
          p_name: string
          p_price_monthly: number
          p_price_yearly: number
        }
        Returns: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'subscription_plans'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_todo: {
        Args: {
          p_description?: string
          p_organization_id: string
          p_title: string
        }
        Returns: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'todos'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_campaign: { Args: { p_campaign_id: string }; Returns: boolean }
      delete_organization: { Args: { target_org_id: string }; Returns: boolean }
      delete_todo: { Args: { p_todo_id: string }; Returns: boolean }
      ensure_my_personal_org: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_org_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_org_id: string
          id: string
          org_description: string
          org_name: string
          org_slug: string
          rejection_reason: string
          requested_at: string
          reviewed_at: string
          reviewed_by_email: string
          status: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_all_organizations: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          address: string
          contact_email: string
          contact_phone: string
          created_at: string
          created_by: string
          description: string
          id: string
          logo_url: string
          member_count: number
          name: string
          settings: Json
          slug: string
          social_links: Json
          status: string
          updated_at: string
          website_url: string
        }[]
      }
      get_campaign: {
        Args: { p_campaign_id: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_campaign_beneficiary: {
        Args: { p_campaign_id: string }
        Returns: {
          document_url: string
          full_name: string
          national_id: string
          notes: string
          phone: string
          relationship: string
        }[]
      }
      get_campaign_by_slug: {
        Args: { p_slug: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_campaign_payment_methods: {
        Args: { p_campaign_id: string }
        Returns: {
          bank_account_name: string
          bank_account_number: string
          bank_branch: string
          bank_name: string
          bank_routing_number: string
          bkash_account_name: string
          bkash_number: string
          campaign_id: string
          donation_url: string
          instructions: string
          is_preferred: boolean
          nagad_account_name: string
          nagad_number: string
          qr_image_url: string
          rocket_account_name: string
          rocket_number: string
        }[]
      }
      get_campaign_tag_ids: {
        Args: { p_campaign_id: string }
        Returns: string[]
      }
      get_campaign_tags: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          label: string
          label_bn: string | null
          slug: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaign_tags'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_campaigns: {
        Args: { p_org_id: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_donation_methods: {
        Args: { p_org_id: string }
        Returns: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bkash_account_name: string | null
          bkash_number: string | null
          created_at: string | null
          donation_url: string | null
          id: string
          instructions: string | null
          is_preferred: boolean | null
          nagad_account_name: string | null
          nagad_number: string | null
          organization_id: string
          qr_image_url: string | null
          rocket_account_name: string | null
          rocket_number: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'donation_methods'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_invites: {
        Args: { p_organization_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: string | null
          token: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'invites'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_membership: {
        Args: { p_org_id: string }
        Returns: {
          is_active: boolean
          is_owner: boolean
          permissions: string[]
          role: string
        }[]
      }
      get_my_org_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_org_id: string
          id: string
          org_description: string
          org_name: string
          org_slug: string
          rejection_reason: string
          requested_at: string
          reviewed_at: string
          status: string
        }[]
      }
      get_my_organizations: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          address: string
          contact_email: string
          contact_phone: string
          created_at: string
          created_by: string
          description: string
          id: string
          joined_at: string
          kind: string
          logo_url: string
          membership_status: string
          name: string
          settings: Json
          slug: string
          social_links: Json
          status: string
          updated_at: string
          user_id: string
          user_role: string
          website_url: string
        }[]
      }
      get_my_profile: {
        Args: Record<PropertyKey, never>
        Returns: Database['shared']['Tables']['profiles']['Row'][]
        SetofOptions: {
          from: '*'
          to: 'profiles'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_subscription: {
        Args: { p_org_id: string }
        Returns: {
          billing_period: string
          current_period_end: string
          current_period_start: string
          description: string
          features: Json
          id: string
          plan_id: string
          plan_name: string
          price_monthly: number
          price_yearly: number
          status: string
        }[]
      }
      get_org_meta: {
        Args: { p_org_id: string }
        Returns: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          description: string | null
          logo_url: string | null
          name: string
          organization_id: string
          settings: Json | null
          social_links: Json | null
          updated_at: string | null
          updated_by: string | null
          website_url: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'org_meta'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_org_overview: {
        Args: { p_org_id: string }
        Returns: {
          confirmed_donations: number
          draft_campaigns: number
          live_campaigns: number
          pending_donation_reports: number
          pending_review_campaigns: number
          raised_total: number
        }[]
      }
      get_organization: {
        Args: { target_org_id: string }
        Returns: {
          address: string
          contact_email: string
          contact_phone: string
          created_at: string
          created_by: string
          description: string
          id: string
          kind: string
          logo_url: string
          member_count: number
          name: string
          settings: Json
          slug: string
          social_links: Json
          status: string
          updated_at: string
          website_url: string
        }[]
      }
      get_organization_members: {
        Args: { target_org_id: string }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'member_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_organization_subscriptions: {
        Args: Record<PropertyKey, never>
        Returns: {
          billing_period: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          org_name: string
          organization_id: string
          plan_name: string
          price_monthly: number
          price_yearly: number
          status: string
        }[]
      }
      get_pending_campaigns: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_campaign_by_slug: {
        Args: { p_slug: string }
        Returns: {
          address: string
          cover_image_url: string
          currency: string
          description: string
          donation_methods: Json
          end_date: string
          goal_amount: number
          id: string
          is_zakat_eligible: boolean
          org_description: string
          org_id: string
          org_logo_url: string
          org_name: string
          org_slug: string
          raised_amount: number
          slug: string
          start_date: string
          tags: Json
          title: string
        }[]
      }
      get_public_campaigns: {
        Args: {
          org_filter?: string
          result_limit?: number
          zakat_filter?: boolean
        }
        Returns: {
          address: string
          cover_image_url: string
          created_at: string
          currency: string
          description: string
          donation_methods: Json
          end_date: string
          goal_amount: number
          id: string
          is_zakat_eligible: boolean
          org_description: string
          org_id: string
          org_logo_url: string
          org_name: string
          org_slug: string
          raised_amount: number
          slug: string
          start_date: string
          tags: Json
          title: string
          updated_at: string
        }[]
      }
      get_public_donation_reports: {
        Args: { p_campaign_id: string; p_limit?: number }
        Returns: {
          amount: number
          created_at: string
          currency: string
          donor_name: string
          id: string
          method: string
        }[]
      }
      get_public_org_by_slug: {
        Args: { org_slug: string }
        Returns: {
          created_at: string
          description: string
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_public_orgs: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
        }[]
      }
      get_subscription_history: {
        Args: { p_org_id: string }
        Returns: {
          action: string
          amount: number
          created_at: string
          id: string
          invoice_number: string
          notes: string
          org_name: string
          organization_id: string
          payment_status: string
          plan_name: string
        }[]
      }
      get_subscription_plans: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'subscription_plans'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_system_admins: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'profile_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_system_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          recent_signups: number
          total_members: number
          total_orgs: number
          total_users: number
        }[]
      }
      get_todos: {
        Args: { p_organization_id: string }
        Returns: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'todos'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'profile_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      grant_system_admin: { Args: { target_user_id: string }; Returns: boolean }
      has_feature: {
        Args: { p_feature: string; p_org_id: string }
        Returns: boolean
      }
      is_system_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      list_donation_reports: {
        Args: { p_campaign_id: string; p_status?: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          donor_name: string
          id: string
          message: string
          method: string
          reference: string
          status: string
        }[]
      }
      list_org_donation_reports: {
        Args: { p_limit?: number; p_org_id: string; p_status?: string }
        Returns: {
          amount: number
          campaign_id: string
          campaign_title: string
          created_at: string
          currency: string
          donor_name: string
          id: string
          message: string
          method: string
          reference: string
          status: string
        }[]
      }
      pause_subscription: { Args: { p_org_id: string }; Returns: boolean }
      propose_donation: {
        Args: {
          p_amount: number
          p_campaign_id: string
          p_donor_name?: string
          p_message?: string
          p_method?: string
          p_reference?: string
          p_turnstile_token?: string
        }
        Returns: {
          created_at: string
          id: string
          status: string
        }[]
      }
      publish_campaign: {
        Args: { p_campaign_id: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reject_campaign: {
        Args: { p_campaign_id: string; p_notes?: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reject_donation_report: {
        Args: { p_note?: string; p_report_id: string }
        Returns: boolean
      }
      reject_org_request: {
        Args: { p_rejection_reason?: string; p_request_id: string }
        Returns: boolean
      }
      remove_organization_member: {
        Args: { target_org_id: string; target_user_id: string }
        Returns: boolean
      }
      revoke_invite: { Args: { p_invite_id: string }; Returns: boolean }
      revoke_system_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      set_campaign_beneficiary: {
        Args: {
          p_campaign_id: string
          p_document_url?: string
          p_full_name: string
          p_national_id?: string
          p_notes?: string
          p_phone?: string
          p_relationship?: string
        }
        Returns: undefined
      }
      set_campaign_payment_methods: {
        Args: {
          p_bank_account_name?: string
          p_bank_account_number?: string
          p_bank_branch?: string
          p_bank_name?: string
          p_bank_routing_number?: string
          p_bkash_account_name?: string
          p_bkash_number?: string
          p_campaign_id: string
          p_donation_url?: string
          p_instructions?: string
          p_is_preferred?: boolean
          p_nagad_account_name?: string
          p_nagad_number?: string
          p_qr_image_url?: string
          p_rocket_account_name?: string
          p_rocket_number?: string
        }
        Returns: undefined
      }
      set_campaign_tags: {
        Args: { p_campaign_id: string; p_tag_ids: string[] }
        Returns: boolean
      }
      set_org_status: {
        Args: { p_org_id: string; p_status: string }
        Returns: boolean
      }
      set_system_admin: { Args: { p_user_id: string }; Returns: boolean }
      submit_campaign_for_review: {
        Args: { p_campaign_id: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      submit_org_request: {
        Args: {
          p_org_description?: string
          p_org_name: string
          p_org_slug: string
        }
        Returns: string
      }
      subscribe_to_plan: {
        Args: { p_billing_period: string; p_org_id: string; p_plan_id: string }
        Returns: {
          billing_period: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'organization_subscriptions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_campaign_raised: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      unpause_subscription: { Args: { p_org_id: string }; Returns: boolean }
      update_campaign: {
        Args: {
          p_address?: string
          p_campaign_id: string
          p_cover_image_url?: string
          p_currency?: string
          p_description?: string
          p_end_date?: string
          p_goal_amount?: number
          p_is_zakat_eligible?: boolean
          p_slug?: string
          p_start_date?: string
          p_status?: Database['donate']['Enums']['campaign_status']
          p_title?: string
        }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_member_role: {
        Args: {
          new_role: string
          target_org_id: string
          target_user_id: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'member_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_my_profile: {
        Args: {
          new_avatar_url?: string
          new_full_name?: string
          new_metadata?: Json
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'profile_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_org_meta: {
        Args: {
          p_address?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_description?: string
          p_logo_url?: string
          p_name?: string
          p_org_id: string
          p_settings?: Json
          p_social_links?: Json
          p_website_url?: string
        }
        Returns: boolean
      }
      update_organization: {
        Args: {
          new_description?: string
          new_name?: string
          new_settings?: Json
          new_slug?: string
          target_org_id: string
        }
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'organization_view'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_subscription_plan: {
        Args: {
          p_description: string
          p_features: Json
          p_is_active: boolean
          p_name: string
          p_plan_id: string
          p_price_monthly: number
          p_price_yearly: number
        }
        Returns: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'subscription_plans'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_todo: {
        Args: {
          p_completed?: boolean
          p_description?: string
          p_title?: string
          p_todo_id: string
        }
        Returns: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'todos'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_donation_methods: {
        Args: {
          p_bank_account_name?: string
          p_bank_account_number?: string
          p_bank_branch?: string
          p_bank_name?: string
          p_bank_routing_number?: string
          p_bkash_account_name?: string
          p_bkash_number?: string
          p_donation_url?: string
          p_instructions?: string
          p_is_preferred?: boolean
          p_nagad_account_name?: string
          p_nagad_number?: string
          p_org_id: string
          p_qr_image_url?: string
          p_rocket_account_name?: string
          p_rocket_number?: string
        }
        Returns: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bkash_account_name: string | null
          bkash_number: string | null
          created_at: string | null
          donation_url: string | null
          id: string
          instructions: string | null
          is_preferred: boolean | null
          nagad_account_name: string | null
          nagad_number: string | null
          organization_id: string
          qr_image_url: string | null
          rocket_account_name: string | null
          rocket_number: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'donation_methods'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      validate_invite: {
        Args: { p_email: string; p_token: string }
        Returns: string
      }
      verify_campaign: {
        Args: { p_campaign_id: string; p_notes?: string }
        Returns: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean | null
          is_zakat_eligible: boolean | null
          org_id: string
          raised_amount: number
          slug: string
          start_date: string | null
          status: Database['donate']['Enums']['campaign_status'] | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      verify_turnstile: {
        Args: { p_remoteip?: string; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      campaign_status:
        'draft' | 'pending_review' | 'live' | 'rejected' | 'closed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  shared: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_system_admin: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_system_admin?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_system_admin?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  donate: {
    Enums: {
      campaign_status: [
        'draft',
        'pending_review',
        'live',
        'rejected',
        'closed',
      ],
    },
  },
  shared: {
    Enums: {},
  },
} as const
