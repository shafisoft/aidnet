# Supabase Database Architecture

This directory contains the database migrations and configuration for the Supabase backend following a **function-first architecture**. (No custom edge functions are used — `functions/` is empty.)

> This is the **donate product's** migration stream. The shared Supabase
> project itself — multi-product schema registry, platform-level migrations,
> and the co-living guidelines other products deploy by — lives in the
> sibling [`platform` repo](../../platform/README.md) (`../platform` from the
> repo root).

## Architecture Overview

This project implements a database-driven architecture where:

- **All database operations go through functions** - No direct table access from client code
- **Restrictive RLS by default** - All tables use "deny all" policies with function-based access
- **Business logic encapsulated in PostgreSQL** - Complex rules live in database functions
- **Selective RLS for complex filtering** - Where functions aren't ideal, targeted RLS policies
- **Comprehensive audit logging** - All important actions tracked automatically

## Philosophy: Database as Application Backend

Instead of treating PostgreSQL as just data storage, we treat it as an application server that provides:

1. **API-like Functions** - Each function acts like a well-defined API endpoint
2. **Security by Default** - RLS + SECURITY DEFINER ensures proper authorization
3. **Data Integrity** - Constraints, triggers, and validation at the source
4. **Single Source of Truth** - Business rules live in one place
5. **Performance** - Complex operations happen where the data lives

## Core Principles

### 1. Function-First Access
```sql
-- ❌ Never do this from client code:
SELECT * FROM organizations WHERE id = 'xyz';

-- ✅ Always do this:
SELECT * FROM get_organization('xyz');
```

### 2. Security Through Functions
```sql
-- Functions run with elevated privileges (SECURITY DEFINER)
-- But apply their own authorization logic:
CREATE OR REPLACE FUNCTION update_organization(org_id UUID, ...)
SECURITY DEFINER AS $$
  -- Check permissions inside function
  IF NOT is_admin_or_owner(auth.uid(), org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  -- Proceed with operation
$$
```

### 3. Restrictive Default Policies
```sql
-- All tables have "deny all" by default:
CREATE POLICY "deny_all_organizations" ON organizations FOR ALL USING (false);

-- Only functions can bypass RLS:
CREATE OR REPLACE FUNCTION get_organizations()
RETURNS SETOF organization_view
LANGUAGE sql SECURITY DEFINER -- Bypasses RLS, applies own logic
```

## Table Structure

### Core Tables

- **`profiles`** - Extends auth.users with additional user information
- **`organizations`** - Teams, companies, workspaces for multi-tenancy (`kind`: 'organization' or 'personal')
- **`organization_members`** - Many-to-many user-organization relationships
- **`roles`** - System and organization role definitions
- **`campaign_payment_methods`** - Per-campaign payout channels donors pay into (1:1 with campaigns, deny-all RLS; access via gated functions)
- **`audit_logs`** - Comprehensive activity tracking

### Personal organizations (individual fundraisers)

A user with no organization can still fundraise: `ensure_my_personal_org()`
lazily provisions their OWN org (`kind = 'personal'`, sole owner-admin, Free
plan auto-attached by trigger). Every gate then works unchanged — `can_perform`,
review queue, donation confirmation, suspension. Personal orgs are tenancy
containers, not listing entries; the client labels them in the org selector
and they surface publicly only through their campaigns. One per user is
enforced by a partial unique index.

### Relationships

```
auth.users → profiles (1:1)
profiles → organization_members (1:N) 
organizations → organization_members (1:N)
organization_members → profiles (N:1)
organization_members → organizations (N:1)
```

## Function Categories

### User Profile Functions
- `get_my_profile()` - Get current user's profile
- `get_user_profile(user_id)` - Get another user's profile (with permission checks)
- `update_my_profile(full_name, avatar_url, metadata)` - Update own profile

### Organization Functions
- `create_organization(name, slug, description, settings)` - Create new organization
- `get_my_organizations()` - Get user's organizations
- `get_organization(org_id)` - Get specific organization details
- `update_organization(org_id, ...)` - Update organization (admin/owner only)
- `delete_organization(org_id)` - Delete organization (owner only)

### Organization Member Functions
- `add_organization_member(org_id, user_email, role)` - Add member (admin/owner only)
- `remove_organization_member(org_id, user_id)` - Remove member (admin/owner only)
- `get_organization_members(org_id)` - Get organization members
- `update_member_role(org_id, user_id, new_role)` - Change member role (admin/owner only)

### Helper Functions
- `is_member(user_id, org_id)` - Check if user is organization member
- `is_admin_or_owner(user_id, org_id)` - Check if user has admin privileges
- `get_user_role(user_id, org_id)` - Get user's role in organization
- `is_system_admin(user_id)` - Check if user is system administrator

### Audit Functions
- `audit_action(user_id, org_id, action, resource_type, resource_id, metadata)` - Log audit event
- `audit_table_changes()` - Trigger function for automatic change logging

## Usage Examples

### Creating an Organization

```sql
-- From client code (TypeScript/JavaScript):
const { data, error } = await supabase.rpc('create_organization', {
  org_name: 'My Startup',
  org_slug: 'my-startup',
  org_description: 'A new venture',
  org_settings: { theme: 'dark' }
});
```

### Managing Organization Members

```sql
-- Add a member:
await supabase.rpc('add_organization_member', {
  target_org_id: 'org-uuid',
  target_user_email: 'user@example.com',
  member_role: 'admin'
});

-- Get members:
await supabase.rpc('get_organization_members', {
  target_org_id: 'org-uuid'
});

-- Update role:
await supabase.rpc('update_member_role', {
  target_org_id: 'org-uuid',
  target_user_id: 'user-uuid',
  new_role: 'admin'
});
```

### User Profile Operations

```sql
// Get current user profile:
await supabase.rpc('get_my_profile');

// Update own profile:
await supabase.rpc('update_my_profile', {
  new_full_name: 'John Doe',
  new_avatar_url: 'https://example.com/avatar.jpg',
  new_metadata: { preferences: { newsletter: true } }
});
```

## Service Layer Integration

Your service layer becomes thin wrappers around database functions:

```typescript
class OrganizationService extends BaseRepository {
  async createOrganization(data: CreateOrganizationDto) {
    return this.supabase.rpc('create_organization', {
      org_name: data.name,
      org_slug: data.slug,
      org_description: data.description,
      org_settings: data.settings
    });
  }

  async addMember(orgId: string, email: string, role: string) {
    return this.supabase.rpc('add_organization_member', {
      target_org_id: orgId,
      target_user_email: email,
      member_role: role
    });
  }
}
```

## Security Model

### Authentication
- Supabase Auth handles user authentication
- `auth.uid()` provides the current user's ID in functions
- User creation triggers automatic profile and default organization creation

### Authorization
- **Function-level**: Each function implements its own permission checks
- **Helper functions**: `is_admin_or_owner()`, `is_member()` for common checks
- **RAISE EXCEPTION**: For unauthorized access attempts

### Audit Logging
- Automatic logging of all important actions
- Triggers on table changes for comprehensive tracking
- IP addresses and user agents captured for security analysis

### RPC EXECUTE surface & accepted lints

`20261008200032` states the whole EXECUTE surface explicitly (never rely on
Postgres defaults — the Era-1 migrations did, which is why the Supabase
linter flagged dozens of functions as anon-callable). Three tiers:

| Tier | Functions | Examples |
| --- | --- | --- |
| **anon** | exactly 6 intentional public RPCs | `get_public_campaigns`, `get_public_campaign_by_slug`, `get_public_org_by_slug`, `get_public_donation_reports`, `propose_donation` (guest donation + Turnstile), `validate_invite` (pre-login invite check) |
| **authenticated** | every other client-facing RPC | profile, org/member, org-request, invite, subscription, campaign, donation-report review, system-admin read/write functions |
| **anon + authenticated (policy machinery)** | RLS-invoked helpers | `can_perform` — policies on `organizations`, `organization_members`, `todos`, `invites` evaluate it as the querying role, so revoking either API role breaks RLS itself; its 0028 finding is accepted |
| **postgres only** | trigger + internal helpers, no RPC surface | `audit_table_changes`, `update_updated_at_column`, `attach_default_plan`, `audit_action`, `sync_campaign_raised`, `verify_turnstile`; plus `create_organization` (orgs must go through `submit_org_request` → `approve_org_request` or the personal-org path) |

Conventions:

- New functions pair the revoke and the grant in the same migration:
  `REVOKE EXECUTE ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`
  (`PUBLIC` matters because Postgres grants EXECUTE to PUBLIC by default;
  use `REVOKE ALL` for postgres-only functions — default privileges from
  `supabase_admin` re-grant EXECUTE to the API roles otherwise).
- `accept_invite` is authenticated-only: the invite page requires a session
  before the accept action renders; only `validate_invite` runs pre-login.
- The five API-schema views (`profile_view`, `organization_view`,
  `organization_detail_view`, `member_view`, `role_view`) exist as
  SECURITY DEFINER return types and are revoked from all API roles
  (`20261008180847`) **and** flipped to `security_invoker`
  (`20261008200031`) so they sit inside the deny-all RLS boundary.
  Never grant roles SELECT on them.

Accepted linter findings (do **not** "fix" these):

- *0028 `anon_security_definer_function_executable`* on the six public
  functions and on `can_perform` (RLS policy machinery) — working as
  designed.
- *0027-family `signed-in users can execute SECURITY DEFINER function`* on
  every RPC — architecture-inherent: deny-all RLS means every function must
  be `SECURITY DEFINER` (an INVOKER function reads nothing), and each one
  enforces its own authorization gate. Revoking `authenticated` would break
  the app; this finding is noise for a function-first schema.
- Every function pins `SET search_path = donate, donate_private, shared,
  extensions` (lint 0011; chain updated at the 2026-11-04 platform cutover —
  tables moved to `donate_private`, legacy `private` merged in and dropped);
  the pgTAP suite `11_execute_grant_surface.sql` is the
  privilege-level tripwire for all of the above.

## Development Workflow

### Local Development

```bash
# Start Supabase local development
supabase start

# Apply migrations
supabase db reset

# Access database directly
psql 'postgresql://postgres:postgres@localhost:54322/postgres'

# Generate TypeScript types from schema
supabase gen types typescript > src/types/database.ts
```

### Migration Management

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Push to remote
supabase db push

# Check migration status
supabase migration list
```

### Testing Functions

```sql
-- Test function with specific user (development only):
SET LOCAL request.jwt.claim.sub = 'user-uuid';

SELECT * FROM get_my_organizations();

-- Test helper functions:
SELECT is_admin_or_owner('user-uuid', 'org-uuid');
SELECT get_user_role('user-uuid', 'org-uuid');
```

## Benefits of This Approach

### Compared to Traditional APIs
- **Faster Development**: No HTTP layer, serialization, middleware
- **Better Performance**: Direct data access, optimized queries
- **Stronger Security**: Database-level enforcement, not application-level
- **Easier Testing**: Test functions directly without HTTP calls
- **Consistency**: Single source of truth for business rules

### Compared to Direct SQL Access
- **Encapsulation**: Business logic hidden behind function interfaces
- **Security**: No risk of clients bypassing business rules
- **Maintainability**: Change implementation without breaking clients
- **Validation**: Centralized input validation and error handling
- **Auditability**: All operations go through controlled entry points

## Performance Considerations

### Optimization Strategies
- **Indexes**: Added on frequently queried columns
- **Views**: Pre-join common queries for efficiency
- **Function Caching**: PostgreSQL caches query execution plans
- **Connection Pooling**: Supabase manages connection pooling

### Monitoring
- Use Supabase dashboard to monitor function performance
- Check `audit_logs` table for usage patterns
- Optimize functions that show high execution times

## Troubleshooting

### Common Issues

**Permission denied errors:**
- Check if user has proper role in organization
- Verify user status is 'active' not 'invited' or 'suspended'
- Ensure you're calling functions as authenticated user

**Function not found:**
- Ensure migrations have been applied: `supabase db reset`
- Check function name spelling and parameters
- Verify function was created successfully

**RLS policy conflicts:**
- Functions with `SECURITY DEFINER` bypass RLS
- Check if function has proper permission checks inside
- Ensure RLS policies aren't too restrictive for intended access

## Best Practices

1. **Always use functions** - Never query tables directly from client code
2. **Validate inputs** - Functions should validate all parameters
3. **Use transactions** - For complex operations requiring atomicity
4. **Return structured data** - Use views for consistent return types
5. **Handle errors gracefully** - Provide clear error messages
6. **Log important actions** - Use audit functions for compliance
7. **Test thoroughly** - Test functions with various permission scenarios
8. **Document functions** - Keep function documentation up to date

## Future Enhancements

Potential additions to consider:

- **Advanced Role System**: RBAC with granular permissions
- **Organization Settings**: More sophisticated configuration options
- **Usage Tracking**: API usage, storage, member count monitoring
- **Subscription Management**: Integration with payment providers
- **Advanced Audit**: Compliance logging, retention policies
- **Performance Monitoring**: Built-in query performance tracking

## Contributing

When adding new features:

1. Create database functions first, then application code
2. Follow existing naming conventions and patterns
3. Include proper authorization checks in functions
4. Add audit logging for important operations
5. Update views if return types change
6. Test with different user roles and permissions
7. Document new functions in this README

---

**Note**: This architecture prioritizes security and maintainability over development speed for complex operations. For simple, user-owned data (like settings), selective direct RLS can be more appropriate.