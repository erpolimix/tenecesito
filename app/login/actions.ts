'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { enforceCriticalRateLimit } from '@/lib/security/rate-limit'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import type { LoginActionState } from './state'

const LOGIN_START_ERROR = 'No se pudo iniciar el acceso con Google. Inténtalo de nuevo.'

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const digest = 'digest' in error ? error.digest : undefined
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')
}

function getSafeNextValue(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== 'string') return null
  if (!rawValue.startsWith('/')) return null
  if (rawValue.startsWith('//')) return null
  return rawValue
}

async function getRequestOrigin() {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
  const protocol = headerStore.get('x-forwarded-proto') || 'https'

  if (!host) {
    return 'http://localhost:3000'
  }

  return `${protocol}://${host}`
}

export async function requestGoogleLogin(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const origin = await getRequestOrigin()
  const next = getSafeNextValue(formData.get('next'))

  try {
    const supabase = await createClient()
    await enforceCriticalRateLimit(supabase, 'login_google_start')
    await verifyTurnstileToken(formData, 'login')

    const redirectTo = new URL('/auth/callback', origin)
    if (next) {
      redirectTo.searchParams.set('next', next)
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
      },
    })

    if (error || !data?.url) {
      throw error || new Error('missing_oauth_url')
    }

    redirect(data.url)
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }

    return {
      error: error instanceof Error && error.message ? error.message : LOGIN_START_ERROR,
      shouldStartOAuth: false,
    }
  }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
