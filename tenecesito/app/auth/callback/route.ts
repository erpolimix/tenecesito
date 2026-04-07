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
        // Ensure profile exists
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', authData.user.id).maybeSingle();
        
        if (!profile) {
            await supabase.from('profiles').insert({ id: authData.user.id });
        }

        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalNode = process.env.NODE_ENV === 'development'

        if (isLocalNode) {
            // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
            return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Ocurrió un error al autenticar.`)
}
