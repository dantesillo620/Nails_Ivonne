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

`config/app_local.php` (no se sube a git) tiene la conexión. Si no existe, cópialo de
`config/app_local.example.php`.

## Comandos

Desde `api/`:

| Comando | Qué hace |
|---|---|
| `$PHP /opt/homebrew/bin/composer serve` | API en http://localhost:8765 |
| `$PHP /opt/homebrew/bin/composer test` | Pruebas (usan SQLite, no necesitan MySQL) |
| `$PHP /opt/homebrew/bin/composer cs-check` | Revisa el estilo de código de CakePHP |
| `$PHP bin/cake.php migrations migrate` | Aplica las migraciones pendientes |

No uses `bin/cake.php server`: arranca el `php` del PATH en lugar del PHP 8.3.

## Endpoints

Las rutas no llevan `/api`: en producción CakePHP vivirá en `/api` del dominio y en desarrollo el
proxy de Angular quitará el prefijo.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/` | `{ok, servicio}`, para comprobar que la API responde |
| GET | `/catalogo` | `{categorias, trabajos}`, visibles y en orden |
| GET | `/catalogo/{codigo}` | `{trabajo}`; el código no distingue mayúsculas (`ni-25`) |

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
