'use client'

import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { systemAdminService } from '@/services/SystemAdminService'
import { organizationService } from '@/services/OrganizationService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useState, useCallback } from 'react'
import type { OrganizationDetailView } from '@/types'
import Link from 'next/link'

export default function AdminOrgsPage() {
  const { t } = useTranslation()
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  usePageTitle(t('admin.allOrgs'))

  const fetcher = useCallback(
    async (params: { limit?: number; cursor?: string | null }) => {
      return systemAdminService.getAllOrgs(params)
    },
    []
  )

  const {
    items: orgs,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePaginatedList<OrganizationDetailView>({
    fetcher,
    limit: 50,
    enabled: !!isSystemAdmin,
  })

  const handleSetStatus = async (
    orgId: string,
    status: 'active' | 'suspended'
  ) => {
    setFeedback(null)
    setActionLoading(true)
    const { error } = await organizationService.setOrgStatus(orgId, status)
    setActionLoading(false)
    if (error) {
      setFeedback({
        type: 'error',
        message: error || t('admin.failedStatusUpdate'),
      })
    } else {
      setFeedback({
        type: 'success',
        message: t('admin.statusUpdated', {
          status: t(`status.${status}`, { defaultValue: status }),
        }),
      })
      await refresh()
    }
  }

  if (adminLoading)
    return (
      <ConsoleShell variant="admin">
        <div>{t('common.loading')}</div>
      </ConsoleShell>
    )

  if (!isSystemAdmin) {
    return (
      <ConsoleShell variant="admin">
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.accessDenied')}
          </h1>
          <p className="mt-2 text-gray-600">{t('errors.accessDeniedBody')}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            {t('common.backToHome')}
          </Link>
        </div>
      </ConsoleShell>
    )
  }

  return (
    <ConsoleShell variant="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin.allOrgs')}</h1>
        {feedback && (
          <div
            className={`rounded-md p-4 ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}
        {error && <p className="text-red-600">{error}</p>}
        {loading ? (
          <div>{t('common.loading')}</div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('common.nameLabel')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('admin.headerSlug')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('admin.headerMembers')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('common.statusLabel')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('common.actionsLabel')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map(org => {
                  const isSuspended = org.status === 'suspended'
                  return (
                    <tr key={org.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        {org.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {org.slug}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {org.member_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isSuspended
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isSuspended
                            ? t('status.suspended')
                            : t('status.active')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() => {
                            // Suspending hides the org's public campaigns
                            // immediately — worth one confirmation. Reactivating
                            // is recovery, so it stays one click.
                            if (
                              !isSuspended &&
                              !window.confirm(
                                t('admin.suspendConfirm', { name: org.name })
                              )
                            )
                              return
                            void handleSetStatus(
                              org.id,
                              isSuspended ? 'active' : 'suspended'
                            )
                          }}
                          disabled={actionLoading}
                          className={`rounded-md px-3 py-2 text-xs font-medium text-white ${
                            isSuspended
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-red-600 hover:bg-red-700'
                          } disabled:opacity-50`}
                        >
                          {isSuspended
                            ? t('admin.activate')
                            : t('admin.suspend')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {hasMore && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {loadingMore
                          ? t('common.loading')
                          : t('admin.loadMore')}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConsoleShell>
  )
}
