'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { campaignService } from '@/services/CampaignService'
import {
  PERSONAL_GOAL_CAP,
  PERSONAL_MAX_DURATION_DAYS,
} from '@/lib/personalLimits'
import { useCampaignTags } from '@/hooks/useCampaigns'
import { useDonationMethods } from '@/hooks/useDonationMethods'
import type {
  Campaign,
  CampaignBeneficiaryDto,
  CreateCampaignDto,
  DonationMethodDto,
  UpdateCampaignDto,
} from '@/types'

export interface CampaignFormState {
  title: string
  slug: string
  description: string
  coverImageUrl: string
  goalAmount: string
  currency: string
  startDate: string
  endDate: string
  isZakatEligible: boolean
  address: string
}

const empty: CampaignFormState = {
  title: '',
  slug: '',
  description: '',
  coverImageUrl: '',
  goalAmount: '',
  currency: 'BDT',
  startDate: '',
  endDate: '',
  isZakatEligible: false,
  address: '',
}

// Payment channels shown to donors on the public campaign page. They are
// saved per campaign (campaign_payment_methods) — each campaign declares
// the account donors actually pay into.
export interface CampaignPaymentState {
  bkashNumber: string
  nagadNumber: string
  rocketNumber: string
  bankName: string
  bankAccountNumber: string
  donationUrl: string
  instructions: string
}

const emptyPayment: CampaignPaymentState = {
  bkashNumber: '',
  nagadNumber: '',
  rocketNumber: '',
  bankName: '',
  bankAccountNumber: '',
  donationUrl: '',
  instructions: '',
}

const emptyBeneficiary: CampaignBeneficiaryDto = {
  fullName: '',
  relationship: '',
  phone: '',
  nationalId: '',
  documentUrl: '',
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Owns all campaign-form state and writes. Components render it;
 * they never call services themselves.
 */
export function useCampaignForm({
  orgId,
  mode,
  campaignId,
  initial,
  isPersonal = false,
}: {
  orgId: string
  mode: 'create' | 'edit'
  campaignId?: string
  initial?: Campaign
  /** Personal-org campaigns get goal/duration caps before publish does. */
  isPersonal?: boolean
}) {
  const router = useRouter()
  const { tags, loading: tagsLoading } = useCampaignTags()
  // Create mode prefills from the org's saved channels; edit mode ignores
  // the template and reads the campaign's own payment details instead.
  const { methods } = useDonationMethods(mode === 'create' ? orgId : null)
  const [form, setForm] = useState<CampaignFormState>(
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          description: initial.description ?? '',
          coverImageUrl: initial.cover_image_url ?? '',
          goalAmount:
            initial.goal_amount != null ? String(initial.goal_amount) : '',
          currency: initial.currency ?? 'BDT',
          startDate: initial.start_date ?? '',
          endDate: initial.end_date ?? '',
          isZakatEligible: initial.is_zakat_eligible ?? false,
          address: initial.address ?? '',
        }
      : empty
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initial?.tags ?? []
  )
  const [payment, setPaymentState] =
    useState<CampaignPaymentState>(emptyPayment)
  const [forPerson, setForPerson] = useState(false)
  const [beneficiary, setBeneficiary] =
    useState<CampaignBeneficiaryDto>(emptyBeneficiary)
  const [paymentTouched, setPaymentTouched] = useState(false)

  // Create mode: prefill payment channels from the org's existing donation
  // methods so the form shows what donors will actually see. Edit mode
  // reads the campaign's own saved channels instead. Manual edits always
  // win — prefill runs once, before any user edit.
  useEffect(() => {
    if (mode !== 'create' || paymentTouched || methods.length === 0) return
    const m = methods[0]
    setPaymentState({
      bkashNumber: m.bkash_number ?? '',
      nagadNumber: m.nagad_number ?? '',
      rocketNumber: m.rocket_number ?? '',
      bankName: m.bank_name ?? '',
      bankAccountNumber: m.bank_account_number ?? '',
      donationUrl: m.donation_url ?? '',
      instructions: m.instructions ?? '',
    })
  }, [mode, methods, paymentTouched])

  // Edit mode: the campaign's own saved channels outrank any org template.
  useEffect(() => {
    if (mode !== 'edit' || !campaignId || paymentTouched) return
    let cancelled = false
    void campaignService.getPaymentMethods(campaignId).then(({ data }) => {
      if (cancelled || paymentTouched || !data) return
      setPaymentState({
        bkashNumber: data.bkash_number ?? '',
        nagadNumber: data.nagad_number ?? '',
        rocketNumber: data.rocket_number ?? '',
        bankName: data.bank_name ?? '',
        bankAccountNumber: data.bank_account_number ?? '',
        donationUrl: data.donation_url ?? '',
        instructions: data.instructions ?? '',
      })
    })
    return () => {
      cancelled = true
    }
  }, [mode, campaignId, paymentTouched])

  const setPayment = useCallback((patch: Partial<CampaignPaymentState>) => {
    setPaymentTouched(true)
    setPaymentState(prev => ({ ...prev, ...patch }))
  }, [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Slug auto-generates from the title until the user edits it by hand.
  // Edit mode starts "edited" so an existing campaign's URL is never
  // silently rewritten just because the title changed.
  const [slugEdited, setSlugEdited] = useState(mode === 'edit')

  const set = <K extends keyof CampaignFormState>(
    key: K,
    value: CampaignFormState[K]
  ) => {
    if (key === 'slug') setSlugEdited(true)
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'title' && !slugEdited) next.slug = slugify(String(value))
      return next
    })
  }

  const toggleTag = (id: string) =>
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )

  const cancel = () => router.push('/dashboard/campaigns')

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required'
    if (forPerson && !beneficiary.fullName.trim())
      return "Person's full name is required for person campaigns"
    if (form.goalAmount && isNaN(Number(form.goalAmount)))
      return 'Goal amount must be a number'
    if (form.goalAmount && Number(form.goalAmount) <= 0)
      return 'Goal amount must be greater than zero'
    if (
      isPersonal &&
      form.goalAmount &&
      Number(form.goalAmount) > PERSONAL_GOAL_CAP
    )
      return `Personal campaign goal is capped at ${PERSONAL_GOAL_CAP.toLocaleString()}`
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate)
      const end = new Date(form.endDate)
      if (end < start) return 'End date must be on or after the start date'
    }
    if (isPersonal && form.endDate) {
      const end = new Date(form.endDate)
      const cap = new Date()
      cap.setDate(cap.getDate() + PERSONAL_MAX_DURATION_DAYS)
      if (end > cap) return 'Personal campaigns can run for at most 90 days'
    }
    return null
  }

  const submit = async () => {
    setSaving(true)
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setSaving(false)
      return
    }

    const slug = form.slug.trim() || slugify(form.title)
    const paymentDto: DonationMethodDto = {
      bkashNumber: payment.bkashNumber || null,
      nagadNumber: payment.nagadNumber || null,
      rocketNumber: payment.rocketNumber || null,
      bankName: payment.bankName || null,
      bankAccountNumber: payment.bankAccountNumber || null,
      donationUrl: payment.donationUrl || null,
      instructions: payment.instructions || null,
    }
    const hasPayment = Object.values(paymentDto).some(v => v !== null)
    if (!SLUG_FORMAT.test(slug)) {
      setError(
        'Slug is required and may only use lowercase letters, numbers and dashes'
      )
      setSaving(false)
      return
    }

    const goal = form.goalAmount ? Number(form.goalAmount) : null

    if (mode === 'create') {
      const dto: CreateCampaignDto = {
        orgId,
        title: form.title,
        slug,
        description: form.description || null,
        coverImageUrl: form.coverImageUrl || null,
        goalAmount: goal,
        currency: form.currency,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isZakatEligible: form.isZakatEligible,
        address: form.address || null,
      }
      const { data, error: err } = await campaignService.createCampaign(dto)
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
      const created = data
      const savedId = created?.id
      if (savedId && hasPayment) {
        const { error: payErr } = await campaignService.setPaymentMethods(
          savedId,
          paymentDto
        )
        if (payErr) {
          setError(
            `Campaign saved, but payment details could not be saved: ${payErr}`
          )
          setSaving(false)
          return
        }
      }
      if (savedId && forPerson) {
        const { error: benErr } = await campaignService.setBeneficiary(
          savedId,
          beneficiary
        )
        if (benErr) {
          setError(
            `Campaign saved, but verification details could not be saved: ${benErr}`
          )
          setSaving(false)
          return
        }
      }
      if (selectedTags.length && created?.id) {
        const { error: tagErr } = await campaignService.setCampaignTags(
          created.id,
          selectedTags
        )
        if (tagErr) {
          setError(`Campaign created, but tags could not be saved: ${tagErr}`)
          setSaving(false)
          return
        }
      }
      router.push('/dashboard/campaigns')
    } else if (campaignId) {
      const dto: UpdateCampaignDto = {
        title: form.title,
        slug,
        description: form.description || null,
        coverImageUrl: form.coverImageUrl || null,
        goalAmount: goal,
        currency: form.currency,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isZakatEligible: form.isZakatEligible,
        address: form.address || null,
      }
      const { error: err } = await campaignService.updateCampaign(
        campaignId,
        dto
      )
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
      // Single read composes current tags, so selectedTags already reflects
      // the saved state; writing it back is always safe (never empty-wipe).
      const { error: tagErr } = await campaignService.setCampaignTags(
        campaignId,
        selectedTags
      )
      if (tagErr) {
        setError(`Saved, but tags could not be updated: ${tagErr}`)
        setSaving(false)
        return
      }
      if (hasPayment) {
        const { error: payErr } = await campaignService.setPaymentMethods(
          campaignId,
          paymentDto
        )
        if (payErr) {
          setError(`Saved, but payment details could not be saved: ${payErr}`)
          setSaving(false)
          return
        }
      }
      if (forPerson) {
        const { error: benErr } = await campaignService.setBeneficiary(
          campaignId,
          beneficiary
        )
        if (benErr) {
          setError(
            `Saved, but verification details could not be saved: ${benErr}`
          )
          setSaving(false)
          return
        }
      }
      router.push('/dashboard/campaigns')
    }
  }

  return {
    mode,
    form,
    set,
    tags,
    tagsLoading,
    selectedTags,
    toggleTag,
    saving,
    error,
    submit,
    cancel,
    payment,
    setPayment,
    forPerson,
    setForPerson,
    beneficiary,
    setBeneficiary,
  }
}

export type CampaignFormController = ReturnType<typeof useCampaignForm>
