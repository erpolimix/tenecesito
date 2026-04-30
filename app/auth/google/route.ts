import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceCriticalRateLimit } from '@/lib/security/rate-limit'
import { verifyTurnstileToken } from '@/lib/security/turnstile'

const LOGIN_START_ERROR = 'No se pudo iniciar el acceso con Google. Inténtalo de nuevo.'

function getSafeNextValue(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== 'string') return null
  if (!rawValue.startsWith('/')) return null
  if (rawValue.startsWith('//')) return null
  return rawValue
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  const formData = await request.formData()
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

    return NextResponse.redirect(data.url, { status: 303 })
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : LOGIN_START_ERROR
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', message)
    if (next) {
      loginUrl.searchParams.set('next', next)
    }
    return NextResponse.redirect(loginUrl, { status: 303 })
  }
}