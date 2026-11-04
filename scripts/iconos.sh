#!/usr/bin/env bash
# Genera los íconos de las apps instalables (PWA) desde los SVG de public/brand/app/:
#
#   icono-*.png, icono-maskable-512.png   app del sitio (fondo vino)
#   panel-*.png, panel-maskable-512.png   app del panel (fondo ciruela; panel-180 es su ícono de iPhone)
#   insignia-96.png                       silueta blanca para la barra de notificaciones de Android
#
# "maskable" lleva el dibujo más chico y centrado: Android recorta el ícono con su forma.
# Uso (macOS): npm run iconos   — requiere qlmanage (incluido en macOS) y el PHP de MAMP con GD.
set -euo pipefail

DIR="public/brand/app"
PHP="${PHP:-/Applications/MAMP/bin/php/1.php8.3.14/bin/php}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

command -v qlmanage >/dev/null || { echo "Falta qlmanage (solo macOS)." >&2; exit 1; }

render() { # svg tamaño destino
  qlmanage -t -s "$2" -o "$TMP" "$1" >/dev/null 2>&1
  mv -f "$TMP/$(basename "$1").png" "$3"
  echo "  ✓ $3"
}

for par in icono:192 icono:512 icono-maskable:512 panel:180 panel:192 panel:512 panel-maskable:512; do
  n="${par%%:*}"
  t="${par##*:}"
  render "$DIR/$n.svg" "$t" "$DIR/$n-$t.png"
done

# QuickLook no deja transparencia: la insignia se dibuja blanca sobre negro y el brillo pasa a ser
# la opacidad.
sed 's#viewBox="0 0 64 64">#viewBox="0 0 64 64"><rect width="64" height="64" fill="\#000000"/>#' \
  "$DIR/insignia.svg" >"$TMP/insignia-negra.svg"
qlmanage -t -s 96 -o "$TMP" "$TMP/insignia-negra.svg" >/dev/null 2>&1
"$PHP" -r '
$src = imagecreatefrompng($argv[1]);
$w = imagesx($src);
$h = imagesy($src);
$out = imagecreatetruecolor($w, $h);
imagealphablending($out, false);
imagesavealpha($out, true);
for ($y = 0; $y < $h; $y++) {
    for ($x = 0; $x < $w; $x++) {
        $c = imagecolorsforindex($src, imagecolorat($src, $x, $y));
        $lum = ($c["red"] + $c["green"] + $c["blue"]) / 3;
        imagesetpixel($out, $x, $y, imagecolorallocatealpha($out, 255, 255, 255, 127 - (int)round($lum / 255 * 127)));
    }
}
imagepng($out, $argv[2], 9);' "$TMP/insignia-negra.svg.png" "$DIR/insignia-96.png"
echo "  ✓ $DIR/insignia-96.png"
