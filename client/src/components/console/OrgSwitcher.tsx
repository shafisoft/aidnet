'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Inbox,
} from 'lucide-react'
import { useOrganization } from '@/hooks/useOrganization'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// Pinned to the top of the console sidebar (docs/ux-restructure-plan.md §2):
// the single place where the user switches org context. Replaces the old
// "My Organizations" dashboard card and the top-nav Organizations dropdown
// for console users.
export function OrgSwitcher({
  variant = 'sidebar',
}: {
  variant?: 'sidebar' | 'chip'
}) {
  const { t } = useTranslation()
  const { currentOrg, organizations, selectOrgById } = useOrganization()

  const activeOrgs = organizations.filter(org => org.status === 'active')
  const label = currentOrg?.name ?? t('console.orgSwitcher.noSelection')
  const currentRole = activeOrgs.find(
    org => org.id === currentOrg?.id
  )?.user_role

  if (variant === 'chip') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          data-org-switcher
          aria-label={`${t('console.orgSwitcher.label')}: ${label}`}
          className="flex h-9 max-w-[11rem] items-center gap-1.5 rounded-full border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Building2
            className="h-3.5 w-3.5 flex-none text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDown
            className="h-3.5 w-3.5 flex-none text-muted-foreground"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <OrgSwitcherContent
          orgs={activeOrgs}
          currentOrgId={currentOrg?.id ?? null}
          onSelect={id => void selectOrgById(id)}
        />
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-org-switcher
        aria-label={`${t('console.orgSwitcher.label')}: ${label}`}
        className="flex w-full items-center gap-2 rounded-md border bg-background p-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{label}</span>
          {currentRole && (
            <span className="block truncate text-xs text-muted-foreground">
              {t(`roles.${currentRole}`, { defaultValue: currentRole })}
            </span>
          )}
        </span>
        <ChevronsUpDown
          className="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <OrgSwitcherContent
        orgs={activeOrgs}
        currentOrgId={currentOrg?.id ?? null}
        onSelect={id => void selectOrgById(id)}
      />
    </DropdownMenu>
  )
}

function OrgSwitcherContent({
  orgs,
  currentOrgId,
  onSelect,
}: {
  orgs: { id: string; name: string; kind?: string }[]
  currentOrgId: string | null
  onSelect: (orgId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <DropdownMenuContent align="start" className="w-60">
      <DropdownMenuLabel>{t('console.orgSwitcher.label')}</DropdownMenuLabel>
      {orgs.map(org => (
        <DropdownMenuItem key={org.id} onSelect={() => onSelect(org.id)}>
          <Check
            className={`h-4 w-4 flex-none ${org.id === currentOrgId ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate">{org.name}</span>
        </DropdownMenuItem>
      ))}
      {orgs.length === 0 && (
        <div className="px-2.5 py-2 text-sm text-muted-foreground">
          {t('console.orgSwitcher.noSelection')}
        </div>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        {/* Authed console users pick an org on /manage/orgs; the public
            directory (/orgs) is a read-only dead end from here. */}
        <Link href="/manage/orgs">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          {t('nav.browseOrgs')}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/org/request">
          <Inbox className="h-4 w-4" aria-hidden="true" />
          {t('nav.requestOrg')}
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
