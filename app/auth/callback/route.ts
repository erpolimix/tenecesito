import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && authData?.user) {
        const displayName = (authData.user.user_metadata?.full_name as string | undefined) ||
          (authData.user.user_metadata?.name as string | undefined) ||
          (authData.user.email?.split('@')[0] ?? null)
        const avatarUrl = (authData.user.user_metadata?.avatar_url as string | undefined) || null

        // Upsert profile so response cards can show who authored each perspective.
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        })

        // En Vercel, el origen de la solicitud (request.url) ya refleja el dominio
        // que el usuario está usando (incluyendo alias como tenecesito-six.vercel.app).
        return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Ocurrió un error al autenticar.`)
}
