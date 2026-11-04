<?php
declare(strict_types=1);

namespace App\Fotos;

use GdImage;
use Psr\Http\Message\UploadedFileInterface;
use RuntimeException;

/**
 * Convierte la foto que sube Ivonne en los archivos que usa el sitio, igual que
 * scripts/fotos.sh:
 *
 * - web/<nombre>-<ancho>.webp en 480, 960 y 1440 px (sin ampliar; si la foto es más
 *   chica que 1440 también se guarda en su ancho original), calidad 78.
 * - og/<nombre>.jpg de hasta 800 px para la vista previa de WhatsApp.
 *
 * Al recodificar se pierden los metadatos (EXIF, ubicación del celular). La orientación
 * del EXIF se aplica antes, para que la foto no salga de lado.
 */
class ProcesadorFotos
{
    public const ANCHOS = [480, 960, 1440];
    public const ANCHO_MINIMO = 400;
    /** 40 MP: más que cualquier celular actual; evita que una imagen enorme agote la memoria. */
    public const MAX_PIXELES = 40_000_000;
    private const ANCHO_COMPARTIR = 800;
    private const CALIDAD_WEBP = 78;
    private const CALIDAD_JPEG = 78;

    /**
     * @param string $dir Carpeta base (con subcarpetas web/ y og/).
     * @param string $url Ruta pública de esa carpeta, p. ej. '/fotos/trabajos'.
     * @param int $maxBytes Tamaño máximo del archivo.
     */
    public function __construct(
        private string $dir,
        private string $url,
        private int $maxBytes,
    ) {
        $this->dir = rtrim($dir, DIRECTORY_SEPARATOR);
        $this->url = rtrim($url, '/');
    }

    /**
     * @param \Psr\Http\Message\UploadedFileInterface $archivo Foto subida.
     * @param string $nombre Nombre base de los archivos ('ni-37-a1b2').
     * @return array{imagen_base: string, imagen_ancho: int, imagen_alto: int, imagen_anchos: string}
     * @throws \App\Fotos\FotoInvalidaException Si la foto no sirve; el mensaje es para Ivonne.
     */
    public function procesar(UploadedFileInterface $archivo, string $nombre): array
    {
        if ($archivo->getError() === UPLOAD_ERR_INI_SIZE || $archivo->getError() === UPLOAD_ERR_FORM_SIZE) {
            throw new FotoInvalidaException('La foto pesa demasiado. Intenta con otra o recórtala.');
        }
        if ($archivo->getError() !== UPLOAD_ERR_OK) {
            throw new FotoInvalidaException('La foto no llegó completa. Intenta subirla de nuevo.');
        }
        if ((int)$archivo->getSize() > $this->maxBytes) {
            throw new FotoInvalidaException('La foto pesa demasiado. Intenta con otra o recórtala.');
        }

        $datos = (string)$archivo->getStream();
        // Con @: un archivo que no es foto avisa con warnings; aquí se responde con un mensaje claro.
        $info = @getimagesizefromstring($datos); // phpcs:ignore Generic.PHP.NoSilencedErrors
        if ($info === false || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            throw new FotoInvalidaException('Ese archivo no es una foto JPG, PNG o WebP.');
        }
        if ($info[0] * $info[1] > self::MAX_PIXELES) {
            throw new FotoInvalidaException('La foto es demasiado grande. Usa una de menos resolución.');
        }
        // GD descomprime la foto completa en memoria: una de 12 MP ocupa ~50 MB.
        $this->asegurarMemoria(256 * 1024 * 1024);

        $imagen = @imagecreatefromstring($datos); // phpcs:ignore Generic.PHP.NoSilencedErrors
        if (!$imagen instanceof GdImage) {
            throw new FotoInvalidaException('No se pudo leer la foto. Intenta con otra.');
        }
        unset($datos);
        if ($info[2] === IMAGETYPE_JPEG) {
            $imagen = $this->enderezar($imagen, $archivo);
        }
        imagepalettetotruecolor($imagen);

        $ancho = imagesx($imagen);
        $alto = imagesy($imagen);
        if ($ancho < self::ANCHO_MINIMO) {
            throw new FotoInvalidaException(sprintf(
                'La foto es muy pequeña (%d px de ancho). Usa una de al menos %d px.',
                $ancho,
                self::ANCHO_MINIMO,
            ));
        }

        $anchos = array_values(array_filter(self::ANCHOS, fn(int $w) => $w <= $ancho));
        if ($ancho < max(self::ANCHOS) && !in_array($ancho, $anchos, true)) {
            $anchos[] = $ancho;
        }

        // Se reduce en cadena (de la más grande a la más chica): es mucho más rápido y usa
        // menos memoria que escalar cada versión desde el original.
        rsort($anchos);
        $this->carpeta('web');
        $this->carpeta('og');
        $escritos = [];
        $compartir = null;
        try {
            foreach ($anchos as $w) {
                $imagen = $this->escalar($imagen, $w);
                $ruta = $this->ruta('web', "{$nombre}-{$w}.webp");
                $this->guardar($imagen, fn(GdImage $i) => imagewebp($i, $ruta, self::CALIDAD_WEBP));
                $escritos[] = $ruta;
                if ($w >= self::ANCHO_COMPARTIR || $compartir === null) {
                    $compartir = $imagen;
                }
            }
            assert($compartir instanceof GdImage);
            $ruta = $this->ruta('og', "{$nombre}.jpg");
            $compartir = $this->sobreBlanco($this->escalar($compartir, min(self::ANCHO_COMPARTIR, $ancho)));
            $this->guardar($compartir, fn(GdImage $i) => imagejpeg($i, $ruta, self::CALIDAD_JPEG));
            $escritos[] = $ruta;
        } catch (RuntimeException $e) {
            array_map('unlink', array_filter($escritos, 'is_file'));
            throw $e;
        }

        sort($anchos);

        return [
            'imagen_base' => "{$this->url}/web/{$nombre}",
            'imagen_ancho' => $ancho,
            'imagen_alto' => $alto,
            'imagen_anchos' => implode(',', $anchos),
        ];
    }

    /**
     * Borra los archivos de una foto subida desde el panel. Las que vienen del repositorio
     * (otra ruta base) no se tocan.
     *
     * @param string $imagenBase Ruta base guardada en el diseño.
     * @return int Archivos borrados.
     */
    public function borrar(string $imagenBase): int
    {
        $prefijo = $this->url . '/web/';
        if (!str_starts_with($imagenBase, $prefijo)) {
            return 0;
        }
        $nombre = basename(substr($imagenBase, strlen($prefijo)));
        if ($nombre === '' || $nombre !== substr($imagenBase, strlen($prefijo))) {
            return 0;
        }

        $archivos = array_merge(
            glob($this->ruta('web', $nombre . '-*.webp')) ?: [],
            glob($this->ruta('og', $nombre . '.jpg')) ?: [],
        );
        foreach ($archivos as $archivo) {
            unlink($archivo);
        }

        return count($archivos);
    }

    /**
     * Sube memory_limit si está por debajo de $bytes (solo durante esta petición).
     *
     * @param int $bytes Memoria necesaria.
     * @return void
     */
    private function asegurarMemoria(int $bytes): void
    {
        $actual = ini_get('memory_limit');
        if ($actual === false || $actual === '-1') {
            return;
        }
        $valor = (int)$actual;
        $unidad = strtolower(substr(trim($actual), -1));
        $valor *= ['g' => 1024 ** 3, 'm' => 1024 ** 2, 'k' => 1024][$unidad] ?? 1;
        if ($valor < $bytes) {
            ini_set('memory_limit', (string)$bytes);
        }
    }

    /**
     * Aplica la orientación del EXIF (las fotos del celular suelen venir giradas).
     *
     * @param \GdImage $imagen Imagen.
     * @param \Psr\Http\Message\UploadedFileInterface $archivo Archivo original.
     * @return \GdImage
     */
    private function enderezar(GdImage $imagen, UploadedFileInterface $archivo): GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $imagen;
        }
        $stream = $archivo->getStream();
        $stream->rewind();
        $tmp = fopen('php://memory', 'r+b');
        if ($tmp === false) {
            return $imagen;
        }
        fwrite($tmp, (string)$stream);
        rewind($tmp);
        $exif = @exif_read_data($tmp); // phpcs:ignore Generic.PHP.NoSilencedErrors
        fclose($tmp);
        $orientacion = is_array($exif) ? (int)($exif['Orientation'] ?? 1) : 1;

        $girar = [3 => 180, 6 => -90, 8 => 90, 5 => -90, 7 => 90][$orientacion] ?? 0;
        if (in_array($orientacion, [2, 4, 5, 7], true)) {
            imageflip($imagen, IMG_FLIP_HORIZONTAL);
        }
        if ($girar !== 0) {
            $girada = imagerotate($imagen, $girar, 0);
            if ($girada instanceof GdImage) {
                return $girada;
            }
        }

        return $imagen;
    }

    /**
     * @param \GdImage $imagen Imagen.
     * @param int $ancho Ancho final.
     * @return \GdImage
     */
    private function escalar(GdImage $imagen, int $ancho): GdImage
    {
        if ($ancho === imagesx($imagen)) {
            return $imagen;
        }
        // Alto redondeado igual que imagenCompartir() (front y API), para que coincida con las meta tags.
        $alto = (int)round(imagesy($imagen) * $ancho / imagesx($imagen));
        $escalada = imagescale($imagen, $ancho, $alto, IMG_BICUBIC);
        if (!$escalada instanceof GdImage) {
            throw new RuntimeException('No se pudo reducir la foto.');
        }
        imagealphablending($escalada, false);
        imagesavealpha($escalada, true);

        return $escalada;
    }

    /**
     * JPEG no tiene transparencia: un PNG con fondo transparente se pone sobre blanco.
     *
     * @param \GdImage $imagen Imagen.
     * @return \GdImage
     */
    private function sobreBlanco(GdImage $imagen): GdImage
    {
        $fondo = imagecreatetruecolor(imagesx($imagen), imagesy($imagen));
        imagefill($fondo, 0, 0, (int)imagecolorallocate($fondo, 255, 255, 255));
        imagecopy($fondo, $imagen, 0, 0, 0, 0, imagesx($imagen), imagesy($imagen));

        return $fondo;
    }

    /**
     * @param \GdImage $imagen Imagen.
     * @param callable(\GdImage): bool $escribir Función que guarda el archivo.
     * @return void
     */
    private function guardar(GdImage $imagen, callable $escribir): void
    {
        if (!$escribir($imagen)) {
            throw new RuntimeException('No se pudo guardar la foto en el servidor.');
        }
    }

    /**
     * @param string $sub Subcarpeta.
     * @return void
     */
    private function carpeta(string $sub): void
    {
        $dir = $this->dir . DIRECTORY_SEPARATOR . $sub;
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException("No se pudo crear la carpeta {$dir}.");
        }
    }

    /**
     * @param string $sub Subcarpeta.
     * @param string $archivo Nombre del archivo.
     * @return string
     */
    private function ruta(string $sub, string $archivo): string
    {
        return $this->dir . DIRECTORY_SEPARATOR . $sub . DIRECTORY_SEPARATOR . $archivo;
    }
}
