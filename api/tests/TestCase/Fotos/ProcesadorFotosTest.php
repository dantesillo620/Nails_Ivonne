<?php
declare(strict_types=1);

namespace App\Test\TestCase\Fotos;

use App\Fotos\ProcesadorFotos;
use Cake\TestSuite\TestCase;
use Laminas\Diactoros\UploadedFile;

class ProcesadorFotosTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = TMP . 'tests' . DS . 'procesador-' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        exec('rm -rf ' . escapeshellarg($this->dir));
    }

    /**
     * JPEG horizontal de 1000×600 con una franja roja arriba y, si se pide, el EXIF
     * Orientation (como los que guarda un celular en vertical: Orientation 6).
     */
    private function jpeg(?int $orientacion = null): string
    {
        $img = imagecreatetruecolor(1000, 600);
        imagefill($img, 0, 0, (int)imagecolorallocate($img, 240, 240, 240));
        imagefilledrectangle($img, 0, 0, 999, 99, (int)imagecolorallocate($img, 255, 0, 0));
        ob_start();
        imagejpeg($img, null, 95);
        $jpeg = (string)ob_get_clean();

        if ($orientacion !== null) {
            // APP1 Exif con un IFD de una sola entrada: 0x0112 Orientation (SHORT).
            $tiff = 'II' . pack('v', 42) . pack('V', 8)
                . pack('v', 1) . pack('vvVvv', 0x0112, 3, 1, $orientacion, 0) . pack('V', 0);
            $app1 = "Exif\0\0" . $tiff;
            $jpeg = substr($jpeg, 0, 2) . "\xFF\xE1" . pack('n', strlen($app1) + 2) . $app1 . substr($jpeg, 2);
        }
        $ruta = TMP . 'tests' . DS . 'orientacion-' . bin2hex(random_bytes(4)) . '.jpg';
        file_put_contents($ruta, $jpeg);

        return $ruta;
    }

    private function procesar(string $ruta): array
    {
        $p = new ProcesadorFotos($this->dir, '/fotos/trabajos', 10 * 1024 * 1024);

        return $p->procesar(new UploadedFile($ruta, (int)filesize($ruta), UPLOAD_ERR_OK, 'f.jpg', 'image/jpeg'), 'prueba');
    }

    /** Color del píxel (x, y) de la versión WebP de 480 px. */
    private function color(int $x, int $y): array
    {
        $img = imagecreatefromwebp($this->dir . '/web/prueba-480.webp');
        $rgb = imagecolorat($img, $x, $y);

        return [($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF];
    }

    public function testEnderezaLaFotoSegunElExif(): void
    {
        $r = $this->procesar($this->jpeg(6));

        // Queda vertical y la franja que estaba arriba pasa al lado derecho.
        $this->assertSame([600, 1000], [$r['imagen_ancho'], $r['imagen_alto']]);
        [$rojo] = $this->color(470, 400);
        $this->assertGreaterThan(200, $rojo);
        [, $verdeIzq] = $this->color(10, 400);
        $this->assertGreaterThan(200, $verdeIzq, 'el lado izquierdo debe ser claro, no rojo');
        $this->assertSame([480, 600], array_map('intval', explode(',', $r['imagen_anchos'])));
    }

    public function testSinExifNoLaGira(): void
    {
        $r = $this->procesar($this->jpeg());

        $this->assertSame([1000, 600], [$r['imagen_ancho'], $r['imagen_alto']]);
        [$rojo, $verde] = $this->color(200, 10);
        $this->assertGreaterThan(200, $rojo);
        $this->assertLessThan(60, $verde);
    }

    public function testLosArchivosNoConservanElExif(): void
    {
        $this->procesar($this->jpeg(6));

        $this->assertStringNotContainsString('Exif', (string)file_get_contents($this->dir . '/og/prueba.jpg'));
    }

    public function testBorrarSoloTocaFotosDelPanel(): void
    {
        $r = $this->procesar($this->jpeg());
        $p = new ProcesadorFotos($this->dir, '/fotos/trabajos', 1024);

        $this->assertSame(0, $p->borrar('/images/trabajos/web/ni-02'));
        $this->assertSame(0, $p->borrar('/fotos/trabajos/web/../og/prueba'));
        // 480, 960 y 1000 (su ancho original) más la imagen para compartir.
        $this->assertSame(4, $p->borrar($r['imagen_base']));
        $this->assertSame([], glob($this->dir . '/*/prueba*'));
    }
}
