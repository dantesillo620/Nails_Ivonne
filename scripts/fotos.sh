#!/usr/bin/env bash
# Genera las copias para web de una foto del catálogo (macOS).
#
# Uso:  npm run fotos -- "public/images/trabajos/mi-foto.jpeg" ni-37
#
# Crea public/images/trabajos/web/<id>-480.webp, -960.webp y -1440.webp
# (sin ampliar fotos pequeñas), la vista previa para WhatsApp en
# public/images/trabajos/og/<id>.jpg (800 px, sin datos EXIF ni ubicación)
# e imprime el INSERT para registrar el diseño en MySQL.
# El original no se modifica. Requiere `sips` (incluido en macOS) y `cwebp`
# y `dwebp` (brew install webp).
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Uso: npm run fotos -- <archivo-original> <id, p. ej. ni-37>" >&2
  exit 1
fi

SRC="$1"
ID="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
OUT="public/images/trabajos/web"

command -v sips >/dev/null || { echo "Falta 'sips' (solo macOS)." >&2; exit 1; }
command -v cwebp >/dev/null || { echo "Falta 'cwebp': brew install webp" >&2; exit 1; }
command -v dwebp >/dev/null || { echo "Falta 'dwebp': brew install webp" >&2; exit 1; }
[ -f "$SRC" ] || { echo "No existe: $SRC" >&2; exit 1; }

mkdir -p "$OUT" public/images/trabajos/og
TMP_DIR="$(mktemp -d)"
TMP="$TMP_DIR/foto.jpg"
trap 'rm -rf "$TMP_DIR"' EXIT

W=$(sips -g pixelWidth "$SRC" | awk 'NR==2{print $2}')
H=$(sips -g pixelHeight "$SRC" | awk 'NR==2{print $2}')

WIDTHS=()
for w in 480 960 1440; do
  if [ "$w" -le "$W" ]; then WIDTHS+=("$w"); fi
done
# Si la foto es más chica que 1440, también se guarda en su ancho original.
if [ "$W" -lt 1440 ] && [[ ! " ${WIDTHS[*]} " =~ " $W " ]]; then WIDTHS+=("$W"); fi

for w in "${WIDTHS[@]}"; do
  sips -s format jpeg -s formatOptions 95 --resampleWidth "$w" "$SRC" --out "$TMP" >/dev/null
  cwebp -quiet -q 78 -m 6 -metadata none "$TMP" -o "$OUT/$ID-$w.webp"
  echo "  ✓ $OUT/$ID-$w.webp"
done

# Vista previa para WhatsApp: se parte del WebP (ya sin metadatos) para no publicar el EXIF del original.
OG_W=$(( W < 800 ? W : 800 ))
MEDIO="${WIDTHS[1]:-${WIDTHS[0]}}"
dwebp -quiet "$OUT/$ID-$MEDIO.webp" -o "$TMP_DIR/og.png"
sips -s format jpeg -s formatOptions 78 --resampleWidth "$OG_W" "$TMP_DIR/og.png" --out "public/images/trabajos/og/$ID.jpg" >/dev/null
echo "  ✓ public/images/trabajos/og/$ID.jpg"

LIST=$(IFS=,; echo "${WIDTHS[*]}")
UPPER="$(echo "$ID" | tr '[:lower:]' '[:upper:]')"

echo
echo "Registra el diseño en la base de datos (cuando exista el panel, se subirá desde ahí)."
echo "Completa título, alt y categoría (1 clasicos, 2 brillo, 3 arte) y ejecútalo en MySQL:"
echo
echo "  INSERT INTO trabajos (codigo, titulo, alt, categoria_id, destacado, visible, orden,"
echo "    imagen_base, imagen_ancho, imagen_alto, imagen_anchos, created, modified)"
echo "  VALUES ('$UPPER', 'TÍTULO', 'Describe lo que se ve en la foto.', 3, 0, 1, 0,"
echo "    '/images/trabajos/web/$ID', $W, $H, '$LIST', NOW(), NOW());"
echo
echo "Aparece en el sitio al recargar; con 'orden' 0 sale primero en el catálogo."
