'use client'

import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { systemAdminSubscriptionService } from '@/services/SystemAdminSubscriptionService'
import { orgSubscriptionService } from '@/services/OrgSubscriptionService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { normalizeFeatures } from '@/lib/normalizeFeatures'
import { PLAN_FEATURES } from '@/lib/planFeatures'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useCallback } from 'react'
import type { SubscriptionPlan } from '@/types'
import Link from 'next/link'

const emptyForm = {
  name: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  features: [] as string[],
}

export default function AdminPlansPage() {
  const { t } = useTranslation()
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // The picker offers the known enforcement keys plus any legacy keys the
  // edited plan already carries (deselectable, so they can be removed).
  const featureChoices: string[] = [
    ...PLAN_FEATURES,
    ...form.features.filter(f => !PLAN_FEATURES.includes(f as never)),
  ]

  const toggleFeature = (key: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter(f => f !== key)
        : [...prev.features, key],
    }))
  }

  usePageTitle(t('admin.plansLink'))

  const loadPlans = useCallback(async () => {
    const { data } = await orgSubscriptionService.getPlans()
    if (data) {
      setPlans(
        data.map(p => ({
          ...p,
          features: normalizeFeatures(p.features),
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) loadPlans()
  }, [isSystemAdmin, loadPlans])

  const handleCreate = async () => {
    setSaving(true)
    const { error } = await systemAdminSubscriptionService.createPlan(
      form.name,
      form.description,
      form.price_monthly,
      form.price_yearly,
      form.features
    )
    if (!error) {
      setShowCreate(false)
      setForm(emptyForm)
      loadPlans()
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editingPlan) return
    setSaving(true)
    const { error } = await systemAdminSubscriptionService.updatePlan(
      editingPlan.id,
      {
        name: form.name,
        description: form.description,
        price_monthly: form.price_monthly,
        price_yearly: form.price_yearly,
        features: form.features,
      }
    )
    if (!error) {
      setEditingPlan(null)
      setForm(emptyForm)
      loadPlans()
    }
    setSaving(false)
  }

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    await systemAdminSubscriptionService.updatePlan(plan.id, {
      is_active: !plan.is_active,
    })
    loadPlans()
  }

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features ?? [],
    })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('admin.plansLink')}</h1>
          </div>
          <button
            onClick={() => {
              setShowCreate(true)
              setEditingPlan(null)
              setForm(emptyForm)
            }}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t('admin.createPlan')}
          </button>
        </div>

        {(showCreate || editingPlan) && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">
              {editingPlan ? t('admin.editPlan') : t('admin.createPlan')}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.nameLabel')}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.descriptionLabel')}
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('admin.priceMonthly')}
                </label>
                <input
                  type="number"
                  value={form.price_monthly}
                  onChange={e =>
                    setForm({ ...form, price_monthly: Number(e.target.value) })
                  }
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('admin.priceYearly')}
                </label>
                <input
                  type="number"
                  value={form.price_yearly}
                  onChange={e =>
                    setForm({ ...form, price_yearly: Number(e.target.value) })
                  }
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <span className="block text-sm font-medium text-gray-700">
                  {t('admin.features')}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {featureChoices.map(key => {
                    const selected = form.features.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleFeature(key)}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t(`features.${key}`, { defaultValue: key })}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingPlan ? handleUpdate : handleCreate}
                disabled={saving || !form.name}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? t('common.saving')
                  : editingPlan
                    ? t('admin.update')
                    : t('admin.create')}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false)
                  setEditingPlan(null)
                }}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div>{t('common.loading')}</div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.nameLabel')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.descriptionLabel')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('billing.monthly')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('billing.yearly')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('admin.headerFeatures')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.statusLabel')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    {t('common.actionsLabel')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plans.map(plan => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{plan.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {plan.description || '-'}
                    </td>
                    <td className="px-4 py-3">
                      ${plan.price_monthly}
                      {t('billing.perMonthShort')}
                    </td>
                    <td className="px-4 py-3">
                      ${plan.price_yearly}
                      {t('billing.perYearShort')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.features || []).map(f => (
                          <span
                            key={f}
                            className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                          >
                            {t(`features.${f}`, { defaultValue: f })}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {plan.is_active
                          ? t('status.active')
                          : t('status.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(plan)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleToggleActive(plan)}
                          className="text-sm text-orange-600 hover:underline"
                        >
                          {plan.is_active
                            ? t('admin.deactivate')
                            : t('admin.activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {t('admin.noPlans')}
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
