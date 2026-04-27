# Checklist de Seguridad de Despliegue

## Variables nuevas

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: clave pública de Cloudflare Turnstile para login y creación de necesidades.
- `TURNSTILE_SECRET_KEY`: clave secreta de Cloudflare Turnstile usada en validación server-side.
- `RATE_LIMIT_PEPPER`: valor secreto para endurecer el hash de sujetos de rate limiting por IP/usuario.

## Vercel

- Activa Web Application Firewall sobre producción y previews públicas.
- Habilita Bot Protection con challenge o bloqueo para tráfico automatizado en `/login`, `/create` y `/post/*` si expones respuestas públicas.
- Añade reglas WAF específicas para ráfagas sobre `/auth/callback`, `/login` y mutaciones POST si publicas endpoints adicionales.
- Limita países o ASN solo si tienes un patrón claro de abuso; evita bloquear usuarios legítimos sin métricas previas.
- Revisa los logs de Firewall y Runtime para confirmar falsos positivos tras activar reglas.

## Supabase Auth

- Revisa y endurece los límites de Auth en el panel de Supabase para OTP/OAuth y recuperación de cuenta.
- Mantén restringidos los redirect URLs de Auth a los dominios reales de Vercel y a localhost de desarrollo.
- Activa protección adicional de bot/captcha en Auth si tu plan o configuración lo permite.
- Revisa proveedores OAuth permitidos y elimina cualquier redirect o dominio sobrante.
- Mantén alertas sobre picos de `signInWithOAuth` y errores repetidos de callback.

## Operación

- Aplica la migración `20260427_add_action_rate_limits.sql` antes de desplegar el nuevo código.
- Configura Turnstile en Vercel antes de activar producción para que login y creación no fallen por falta de secreto.
- Revisa periódicamente la tabla `security_rate_limit_buckets` y purga histórica si el volumen crece más de lo esperado.
