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
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: boolean }
      add_organization_member: {
        Args: {
          member_role?: string
          target_org_id: string
          target_user_email: string
        }
        Returns: unknown[]
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
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'organization_subscriptions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_campaign: {
        Args: { p_campaign_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
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
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_invite: {
        Args: { p_email: string; p_organization_id: string; p_role?: string }
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaign_tags'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_campaigns: {
        Args: { p_org_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_donation_methods: {
        Args: { p_org_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'donation_methods'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_invites: {
        Args: { p_organization_id: string }
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_personal_campaigns: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          currency: string
          goal_amount: number
          id: string
          org_id: string
          org_name: string
          slug: string
          status: string
          title: string
        }[]
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
          pending_amount: number
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
          p_offset?: number
          result_limit?: number
          zakat_filter?: boolean
        }
        Returns: {
          cover_image_url: string
          currency: string
          description: string
          goal_amount: number
          id: string
          is_zakat_eligible: boolean
          org_id: string
          org_name: string
          pending_amount: number
          raised_amount: number
          slug: string
          title: string
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
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'subscription_plans'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_system_admins: {
        Args: Record<PropertyKey, never>
        Returns: unknown[]
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
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'todos'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_profile: {
        Args: { target_user_id: string }
        Returns: unknown[]
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
      list_campaign_abuse_reports: {
        Args: Record<PropertyKey, never>
        Returns: {
          campaign_id: string
          campaign_slug: string
          campaign_title: string
          contact: string
          created_at: string
          details: string
          id: string
          reason: string
          resolved_at: string
        }[]
      }
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
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reject_campaign: {
        Args: { p_campaign_id: string; p_notes?: string }
        Returns: unknown[]
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
      report_campaign:
        | {
            Args: {
              p_campaign_id: string
              p_contact?: string
              p_details?: string
              p_reason: string
            }
            Returns: string
          }
        | {
            Args: {
              p_campaign_id: string
              p_contact?: string
              p_details?: string
              p_reason: string
              p_turnstile_token?: string
            }
            Returns: string
          }
      resolve_campaign_abuse_report: {
        Args: { p_report_id: string }
        Returns: string
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
        Returns: unknown[]
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
        Returns: unknown
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
      unpublish_campaign: {
        Args: { p_campaign_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'campaigns'
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown
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
        Returns: unknown[]
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
        Returns: unknown[]
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
        Returns: unknown[]
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
