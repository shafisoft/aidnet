import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n/config'
import { RouteAccessGuard } from './RouteAccessGuard'

const push = vi.fn()

let mockAuth: {
  user: unknown
  loading: boolean
}
let mockAdmin: { isSystemAdmin: boolean; loading: boolean }
let mockPathname: string

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => mockPathname,
}))

vi.mock('@/hooks/useAuth', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>()
  return {
    ...actual,
    useAuth: () => mockAuth,
  }
})

vi.mock('@/hooks/useSystemAdmin', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/useSystemAdmin')>()
  return {
    ...actual,
    useSystemAdmin: () => mockAdmin,
  }
})

const renderGuard = () =>
  render(
    <RouteAccessGuard>
      <div>protected-content</div>
    </RouteAccessGuard>
  )

describe('RouteAccessGuard', () => {
  beforeEach(async () => {
    // i18n boots in Bangla for hydration parity; the provider applies the
    // user's language after mount. Pin English so text assertions match.
    await i18n.changeLanguage('en')
    push.mockClear()
    mockAuth = { user: null, loading: false }
    mockAdmin = { isSystemAdmin: false, loading: true }
    mockPathname = '/'
  })

  it('renders content for public routes without touching auth', () => {
    mockPathname = '/campaigns'
    renderGuard()

    expect(screen.getByText('protected-content')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('redirects anon users away from authenticated routes', () => {
    mockPathname = '/manage/orgs'
    renderGuard()

    expect(push).toHaveBeenCalledWith('/auth/login')
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
  })

  it('holds content while auth session restores', () => {
    mockPathname = '/profile'
    mockAuth = { user: null, loading: true }
    renderGuard()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
  })

  it('denies non-admins inline on /admin routes', () => {
    mockPathname = '/admin/plans'
    mockAuth = { user: { id: 'user-1' }, loading: false }
    mockAdmin = { isSystemAdmin: false, loading: false }
    renderGuard()

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('lets system admins through /admin routes', () => {
    mockPathname = '/admin'
    mockAuth = { user: { id: 'admin-1' }, loading: false }
    mockAdmin = { isSystemAdmin: true, loading: false }
    renderGuard()

    expect(screen.getByText('protected-content')).toBeInTheDocument()
  })

  it('waits for the admin check before denying', () => {
    mockPathname = '/admin/orgs'
    mockAuth = { user: { id: 'user-1' }, loading: false }
    renderGuard()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
  })
})
