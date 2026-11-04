# Nails Ivonne API

Backend del sitio, hecho con **CakePHP 5** y **MySQL**. Es una API JSON que el sitio Angular consulta
en `/api` del mismo dominio. Aquí se guardan el catálogo, y más adelante las citas y la cuenta del panel
de administración.

## Requisitos

- PHP 8.2 o más reciente con `intl`, `mbstring`, `pdo_mysql` y `gd` (con WebP).
  En local se usa el PHP 8.3 de MAMP. El `php` de Homebrew del PATH es 8.0 y no sirve.
- MySQL 8 (el de MAMP, puerto 8889).
- Composer.

Para no escribir la ruta completa en cada comando:

```sh
export PHP=/Applications/MAMP/bin/php/1.php8.3.14/bin/php
```

## Primera vez en local

1. Enciende **MySQL** en MAMP. Apache no hace falta.
2. Crea la base de datos:
   ```sh
   /Applications/MAMP/Library/bin/mysql80/bin/mysql -h 127.0.0.1 -P 8889 -u root -proot \
     -e "CREATE DATABASE IF NOT EXISTS nails_ivonne CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   ```
3. Instala dependencias, crea las tablas y carga el catálogo actual:
   ```sh
   cd api
   $PHP /opt/homebrew/bin/composer install
   $PHP bin/cake.php migrations migrate
   $PHP bin/cake.php seeds run Catalogo
   $PHP bin/cake.php seeds run Ajustes
   ```

4. Crea una cuenta para el panel (la contraseña se pide sin mostrarse, mínimo 10 caracteres):
   ```sh
   $PHP bin/cake.php usuario crear ivonne@correo.com "Ivonne"
   ```
   Para cambiarla: `$PHP bin/cake.php usuario contrasena ivonne@correo.com`.

`config/app_local.php` (no se sube a git) tiene la conexión. Si no existe, cópialo de
`config/app_local.example.php`.

## Comandos

Desde `api/`:

| Comando | Qué hace |
|---|---|
| `$PHP /opt/homebrew/bin/composer serve` | API en http://127.0.0.1:8765 |
| `$PHP /opt/homebrew/bin/composer test` | Pruebas (usan SQLite, no necesitan MySQL) |
| `$PHP /opt/homebrew/bin/composer cs-check` | Revisa el estilo de código de CakePHP |
| `$PHP bin/cake.php migrations migrate` | Aplica las migraciones pendientes. Después corre `$PHP bin/cake.php schema_cache clear`: CakePHP guarda las columnas de cada tabla y no vería las nuevas |

No uses `bin/cake.php server`: arranca el `php` del PATH en lugar del PHP 8.3.

## Endpoints

Las rutas no llevan `/api`: en producción CakePHP vivirá en `/api` del dominio y en desarrollo el
proxy de Angular quitará el prefijo.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/` | `{ok, servicio}`, para comprobar que la API responde |
| GET | `/catalogo` | `{categorias, trabajos}`, visibles y en orden |
| GET | `/catalogo/{codigo}` | `{trabajo}`; el código no distingue mayúsculas (`ni-25`) |
| GET | `/disenos/{codigo}` | HTML: el sitio (`Sitio.shell`) con las meta tags del diseño; 404 si no existe o está oculto |
| GET | `/sitemap.xml` | XML con el inicio y todos los diseños visibles |

### Agenda pública

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/agenda/disponibilidad` | `{agenda, hoy, ocupados: ['AAAA-MM-DD HH:MM'], diasBloqueados}`. Solo horarios, nunca de quién |
| POST | `/agenda/citas` | `{nombre, telefono, fecha, hora, nota?, disenos?}` → 201 `{cita}` pendiente. 422 con `ocupado: true` si alguien más apartó ese horario |

`POST /agenda/citas` no pide token CSRF: es público y no hay sesión que proteger. Lo cuidan un
límite de 5 solicitudes por IP cada hora (429) y un campo trampa (`sitio`) que solo llena un bot.
Se valida con la hora de Guadalajara (`App\Agenda\Agenda`): el horario de ese día, la anticipación
de hoy, la ventana de semanas, los bloqueos y el índice único de horario.

### Panel

Piden sesión (401 sin ella). Los `POST`, `PATCH`, `PUT` y `DELETE` piden además la cabecera
`X-CSRF-Token` con el token de `/auth/sesion` (403 sin él): la cookie CSRF vive en `/api` y el panel
no puede leerla.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/auth/sesion` | `{usuario \| null, csrfToken}` |
| POST | `/auth/login` | `{email, password}` → `{usuario, csrfToken}`; 401 si no coinciden, 429 tras 5 intentos fallidos (por IP o correo, 15 min) |
| POST | `/auth/logout` | Cierra la sesión |
| GET | `/admin/catalogo` | `{categorias, trabajos}` con todos los diseños, también los ocultos |
| POST | `/admin/trabajos` | Multipart: `foto`, `titulo`, `alt`, `categoria` (slug), `destacado`, `visible`. 201 con `{trabajo}` |
| PATCH | `/admin/trabajos/{id}` | Cambia `titulo`, `alt`, `categoria`, `destacado` o `visible` |
| PUT | `/admin/trabajos/orden` | `{ids: [...]}`: el orden nuevo; los que falten quedan al final |
| DELETE | `/admin/trabajos/{id}` | Borra el diseño y, si su foto se subió desde el panel, sus archivos |
| GET | `/admin/agenda?semana=AAAA-MM-DD` | La semana (lunes a domingo) con citas (también canceladas), bloqueos y cuántas hay por confirmar |
| PATCH | `/admin/citas/{id}` | `{estado}`: `confirmada`, `cancelada` o `pendiente`. 422 si al reactivarla su horario ya se ocupó |
| POST | `/admin/citas` | Cita que llegó por otro lado; queda confirmada y puede ser a cualquier hora |
| POST | `/admin/bloqueos` | `{fecha, hora?, motivo?}`; sin hora bloquea el día completo |
| DELETE | `/admin/bloqueos/{id}` | Quita el bloqueo |
| GET | `/admin/push` | `{clavePublica \| null, dispositivos}` de esta cuenta |
| POST | `/admin/push/suscripciones` | `{endpoint, keys: {p256dh, auth}, dispositivo?}` del navegador; si el endpoint ya existe se reemplaza |
| POST | `/admin/push/suscripciones/quitar` | `{endpoint}`: ese dispositivo deja de recibir avisos (POST porque algunos servidores descartan el cuerpo de un DELETE) |
| POST | `/admin/push/prueba` | Aviso de prueba a los dispositivos de esta cuenta |

Los errores de datos responden 422 con `{message, errores: {campo: mensaje}}`, en español y listos
para mostrarse.

### Avisos (Web Push)

`App\Push\Notificador` manda las notificaciones con `minishlink/web-push` (con el cliente HTTP de
CakePHP) y el formato del service worker de Angular. Los dispositivos que el servicio de push da por
perdidos se borran solos. Nunca lanza errores: si un aviso falla, la cita se guarda igual (queda en
`logs/error.log`).

- **Al apartar una cita** desde la página: *Nueva cita por confirmar*, a todos los dispositivos.
- **Recordatorio antes de cada cita:** `bin/cake agenda recordatorios` avisa *En 1 h: Ana* con la hora y
  los diseños, una sola vez por cita (`citas.recordada`). La anticipación la elige Ivonne en *Avisos*
  (30 min a 3 h, o apagado; ajuste `avisos`). Va en un cron cada 10 minutos.
- **Resumen del día:** `bin/cake agenda resumen` manda *Hoy tienes N citas* con las horas y las
  pendientes. Usa el día de Guadalajara, sin importar la zona del servidor, y si no hay nada no manda
  aviso. Va en un cron cada mañana (ver Producción).
- **Claves VAPID:** `bin/cake push claves` las genera; van en `config/app_local.php` (`Push`), nunca en
  git. Cada servidor tiene las suyas, y si cambian, cada dispositivo tiene que volver a activar los avisos.
- `bin/cake push prueba` manda un aviso a todos los dispositivos, para revisar desde la terminal.

### Fotos del panel

`ProcesadorFotos` hace lo mismo que `scripts/fotos.sh`: WebP de 480, 960 y 1440 px (sin ampliar),
JPEG de 800 px para WhatsApp, orientación según el EXIF y sin metadatos. Se guardan en `Fotos.dir`
(`web/` y `og/`) y se publican en `Fotos.url`:

- Producción: `public_html/fotos/trabajos`, servida en `/fotos/trabajos`.
- Local: `api/webroot/fotos/trabajos`, servida en `/api/fotos/trabajos` (no se sube a git).

Una foto de 12 MP necesita unos 150 MB de memoria; el procesador sube `memory_limit` a 256 MB solo
mientras la procesa. El panel la reduce a 2400 px antes de subirla.

`/disenos/{codigo}` y `/sitemap.xml` los pide el `.htaccess` del sitio en Hostinger, no Angular.
`Sitio.shell` es la ruta al `index.csr.html` compilado: en producción, `public_html/index.csr.html`
(la carpeta de arriba de la API); en local, `dist/` según `config/app_local.php`.

`categorias` y `trabajos` usan la misma forma que las interfaces `Categoria` y `Trabajo` de
`src/app/data/trabajos.ts`. Los errores también son JSON: `{message, url, code}`.

## Datos

| Tabla | Qué guarda |
|---|---|
| `categorias` | `slug` (`clasicos`, `brillo`, `arte`), nombre y orden |
| `trabajos` | Código (`NI-07`), título, texto alternativo, categoría, destacado, visible, orden y la imagen (`imagen_base` más los anchos WebP) |
| `citas` | Nombre, WhatsApp (solo dígitos), fecha y hora locales, estado (`pendiente`, `confirmada`, `cancelada`) y nota |
| `citas_trabajos` | Diseños que la clienta eligió para su cita |
| `bloqueos` | Días u horarios sin atención; `hora` vacía bloquea el día completo |
| `ajustes` | JSON por clave. `agenda`: zona horaria (`America/Mexico_City`), horas de inicio por día, semanas visibles y anticipación |
| `usuarios` | Cuentas del panel; la contraseña se guarda como hash |
| `push_suscripciones` | Dispositivos de cada cuenta que reciben notificaciones |

Reglas que cuida la base, no solo la API:

- **No hay dos citas activas en el mismo horario.** El índice único `(fecha, hora, ocupa)` lo impide;
  `ocupa` vale 1 en citas pendientes o confirmadas y NULL en canceladas, así que cancelar libera el
  horario. CakePHP calcula `ocupa` al guardar.
- La clienta no puede elegir el estado de su cita: siempre entra como `pendiente`.

`config/Seeds/catalogo.json` es el catálogo exportado de `trabajos.ts` el 2026-11-04. Los seeds omiten
lo que ya existe. CakePHP recuerda qué seeds corrieron, así que para repetir uno usa `--force`.

## Producción (Hostinger)

Pendiente de definir al rentar el hosting. Lo que ya se sabe:

- Configurar `APP_FULL_BASE_URL` con el dominio: en producción la API rechaza peticiones a otro host.
- Poner `debug` en `false` y los datos de MySQL de Hostinger en `config/app_local.php`.
- `tmp/` debe poder escribirse: ahí viven las sesiones del panel y el conteo de intentos.
- **No borrar `public_html/fotos/` al publicar una versión nueva**: ahí están las fotos que subió
  Ivonne, y no están en git ni en el build.
- Crear la cuenta de Ivonne con `bin/cake usuario crear` por SSH.
- Generar las claves de avisos con `bin/cake push claves` y ponerlas en `config/app_local.php`. Cambiar
  `Push.subject` por el dominio definitivo.
- Cron del resumen diario (panel de Hostinger → Avanzado → Cron Jobs). El servidor suele estar en UTC:
  las 14:00 UTC son las 8:00 de Guadalajara.
  ```
  0 14 * * *     cd ~/public_html/api && php bin/cake.php agenda resumen
  */10 * * * *   cd ~/public_html/api && php bin/cake.php agenda recordatorios
  ```
- Después de cada `migrations migrate`, correr `bin/cake schema_cache clear`.
- El sitio debe servirse por **HTTPS**: el service worker y los avisos no funcionan sin él.
