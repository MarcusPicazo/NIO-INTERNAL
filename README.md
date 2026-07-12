# NIMIO LEVELS

Web app privada para motivacion, puntos, niveles, avatares y recompensas del equipo NIMIO.

## Arquitectura propuesta

- **Next.js + TypeScript**: app router, server actions y rutas protegidas por cookies HTTP-only firmadas.
- **Supabase Postgres**: tablas, vistas de saldos, funciones atomicas para aprobaciones y politicas RLS.
- **Supabase Storage**: avatares, GIFs, imagenes de recompensas y evidencia privada.
- **Tailwind CSS**: interfaz oscura, industrial, premium y responsive.
- **Vercel**: despliegue recomendado, usando variables de entorno.

El navegador nunca recibe la service role key. Las operaciones sensibles pasan por servidor.

## Tablas principales

- `admins`: dueno administrador con correo, contrasena hasheada e indicador de propietario.
- `members`: perfiles del equipo, estado, avatar y notas privadas.
- `access_codes`: codigos personales hasheados con `pgcrypto`; los codigos antiguos se bloquean.
- `levels`: niveles editables por puntos historicos.
- `member_level_assets`: avatar/GIF personalizado por miembro y nivel.
- `point_requests`: solicitudes de puntos del integrante.
- `point_movements`: ledger/auditoria de todo cambio de puntos.
- `rewards`: recompensas y valor MXN editable.
- `redemption_requests`: solicitudes de canje con snapshot de valor al aprobar.
- `admin_audit_logs`: bitacora de acciones administrativas.
- `projects`: proyectos NIO/NIMIO.
- `system_settings`: equivalencias generales, como valor MXN por punto.

## Permisos

El MVP usa sesiones propias firmadas:

- Miembro: entra con codigo personal, solo ve su perfil, movimientos, solicitudes y canjes.
- Administrador: entra con correo y contrasena creados una sola vez en `/admin/setup`.
- Token temporal: opcional como respaldo de emergencia si configuras `ADMIN_ACCESS_TOKEN`.

La migracion tambien deja politicas RLS preparadas para una futura integracion directa con Supabase Auth y claims:

- `app_role = admin` para administracion.
- `member_id = <uuid>` para lectura propia de integrante.

## MVP listo

- Login privado por codigo personal.
- Login admin.
- Panel admin con dashboard, miembros, solicitudes, movimientos, canjes, recompensas, niveles, reportes, export CSV y configuracion.
- Perfil privado de integrante.
- Solicitud de puntos con evidencia URL o archivo privado.
- Aprobacion, ajuste, rechazo o solicitud de mas evidencia.
- Canjes sin descuento hasta aprobacion.
- Movimiento negativo automatico al aprobar canje.
- Saldos separados: historicos, gastados, descontados y disponibles.
- Niveles calculados con puntos historicos.
- Avatares/GIFs por miembro y por nivel.
- Storage para assets y evidencia.
- Datos semilla para probar.

## Preparado para mejoras futuras

- Supabase Auth con JWT claims para que RLS sea usado directamente desde cliente.
- Notificaciones en tiempo real.
- Filtros avanzados por periodo, proyecto y persona en UI.
- Reglas de equivalencia por rangos.
- Limites mensuales automaticos de recompensas.
- Edicion completa inline de niveles/recompensas existentes.
- Firmas o comprobantes de pago estructurados.

## Instalacion local

1. Instala dependencias:

```bash
pnpm install
```

2. Crea `.env.local` desde `.env.example`:

```bash
cp .env.example .env.local
```

3. Configura:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NIMIO_SESSION_SECRET=...
ADMIN_ACCESS_TOKEN=... # opcional
```

Genera `NIMIO_SESSION_SECRET` con:

```bash
openssl rand -base64 48
```

4. Ejecuta la migracion en Supabase SQL Editor:

```sql
-- contenido de supabase/migrations/0001_initial_schema.sql
```

5. Ejecuta datos semilla:

```sql
-- contenido de supabase/seed.sql
```

6. Corre local:

```bash
pnpm dev
```

## Datos de prueba

Los codigos de prueba estan en el seed y son faciles de borrar:

- `AMY-4P9X`
- `DAVID-7MQR`
- `JORGE-8F2K`
- `MEGG-5NIO`
- `DEMIAN-9ADM`

El primer admin se crea una sola vez en `/admin/setup`. Despues entra por `/admin/login` con correo y contrasena.

## Despliegue en Vercel

1. Sube el repo a GitHub.
2. Crea proyecto en Vercel.
3. Agrega las variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NIMIO_SESSION_SECRET`
   - `ADMIN_ACCESS_TOKEN` solo si quieres respaldo temporal
4. Ejecuta migracion y seed en Supabase antes del primer uso.
5. Deploy.
6. Abre `/admin/setup` y crea el primer dueno administrador.

## Valores que debes configurar despues

- Correo y contrasena del dueno administrador en `/admin/setup`.
- URL y service role key de Supabase.
- Secret de sesion.
- Recompensas reales y valores MXN.
- Niveles definitivos.
- Avatares/GIFs base.
- Avatares/GIFs personalizados por persona.
- Proyectos activos.
- Regla real de equivalencia de puntos.

## Pruebas manuales de seguridad y funcionamiento

1. Entrar con codigo valido de Amy y confirmar que solo ve su perfil.
2. Entrar con codigo invalido y confirmar error claro.
3. Bloquear un miembro desde admin y confirmar que su codigo ya no entra.
4. Regenerar codigo y confirmar que el codigo anterior queda bloqueado.
5. Crear solicitud de puntos como miembro y confirmar que no suma saldo.
6. Aprobar solicitud desde admin y confirmar movimiento positivo.
7. Aprobar con ajuste y confirmar `approved_adjusted`.
8. Rechazar solicitud y confirmar que no crea movimiento.
9. Crear descuento manual con motivo y confirmar que baja disponibles, no historicos.
10. Solicitar canje y confirmar que no descuenta hasta aprobacion.
11. Aprobar canje y confirmar movimiento negativo, puntos gastados y snapshot MXN.
12. Gastar puntos y confirmar que el nivel/avatar no baja.
13. Exportar CSV de miembros, movimientos, solicitudes, canjes, recompensas y niveles.
14. Abrir vista imprimible de un miembro y guardar PDF desde el navegador.
15. Intentar abrir evidencia privada sin sesion y confirmar rechazo.
