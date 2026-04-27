'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enforceCriticalRateLimit } from '@/lib/security/rate-limit'
import { verifyTurnstileToken } from '@/lib/security/turnstile'

export type LoginActionState = {
  error: string | null
  shouldStartOAuth: boolean
}

export const INITIAL_LOGIN_ACTION_STATE: LoginActionState = {
  error: null,
  shouldStartOAuth: false,
}

export async function requestGoogleLogin(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  try {
    const supabase = await createClient()
    await enforceCriticalRateLimit(supabase, 'login_google_start')
    await verifyTurnstileToken(formData, 'login')
    return { error: null, shouldStartOAuth: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se pudo validar el acceso con Google',
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
