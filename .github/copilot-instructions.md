# Copilot Context - TeNecesito

Este archivo define el contexto del proyecto para que las sugerencias de Copilot sean coherentes con la arquitectura actual.

## Proyecto

- App web en Next.js (App Router) para publicar pedidos de ayuda y responder.
- Idioma de UI y mensajes: espanol.
- Estilo visual: fuerte contraste, bordes negros marcados, tipografia bold, paleta viva por categoria.

## Stack

- Next.js 16 + React 19 + TypeScript.
- Tailwind CSS v4 (via `@import "tailwindcss"` en `app/globals.css`).
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) para auth y datos.
- Iconos con `lucide-react`.

## Estructura relevante

- Rutas App Router en `app/`.
- Server Actions por pagina en archivos `actions.ts` (ej: `app/create/actions.ts`).
- Cliente Supabase server-side en `lib/supabase/server.ts`.
- Middleware de sesion en `middleware.ts` + `lib/supabase/middleware.ts`.
- Componentes compartidos en `components/`.
- Constantes de categorias en `lib/constants.ts`.

## Reglas de implementacion

- Preferir Server Components y Server Actions cuando aplique.
- Al escribir acciones con datos:
  - Crear cliente con `createClient()` de `lib/supabase/server.ts`.
  - Validar usuario con `supabase.auth.getUser()` antes de operaciones sensibles.
  - Aplicar controles de autorizacion por `author_id` cuando corresponda.
  - Usar `revalidatePath(...)` para refrescar vistas afectadas.
  - Usar `redirect(...)` solo cuando la UX lo requiera.
- Mantener paginacion con `range(offset, offset + limit - 1)` cuando se consulten listas.
- Evitar introducir API routes si ya existe patron con Server Actions.

## Convenciones de codigo

- Mantener TypeScript estricto y firmas tipadas.
- No agregar librerias nuevas sin necesidad clara.
- Hacer cambios pequenos y localizados; evitar refactors grandes no pedidos.
- Respetar nombres y estructura existente antes de proponer nuevas abstracciones.
- Si hay errores de Supabase en lecturas no criticas, loggear con `console.error` y devolver fallback seguro (ej: array vacio).

## Convenciones de UI

- Preservar el lenguaje visual actual (bloques fuertes, botones con borde, contraste alto).
- Mantener responsive mobile/desktop.
- Reusar categorias y colores definidos en `lib/constants.ts`.
- Mantener textos de interfaz en espanol.

## Variables de entorno esperadas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No hardcodear secretos ni claves privadas en el codigo.

## Al editar

- No romper contratos existentes de Server Actions usadas por formularios.
- Si se cambia una consulta o mutacion, verificar que se revaliden rutas relacionadas (`/feed`, `/dashboard`, `/post/[id]`, layout cuando impacta navbar).
- Mantener la app funcionando sin requerir cambios de arquitectura no solicitados.
