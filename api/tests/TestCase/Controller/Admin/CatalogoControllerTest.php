<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Admin;

use Cake\Core\Configure;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;
use Laminas\Diactoros\UploadedFile;

class CatalogoControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = [
        'app.Usuarios',
        'app.PushSuscripciones',
        'app.Categorias',
        'app.Trabajos',
        'app.Citas',
        'app.CitasTrabajos',
        'app.Ajustes',
    ];

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = TMP . 'tests' . DS . 'fotos-' . bin2hex(random_bytes(4));
        Configure::write('Fotos.dir', $this->dir);
        Configure::write('Fotos.url', '/fotos/trabajos');
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        if (is_dir($this->dir)) {
            exec('rm -rf ' . escapeshellarg($this->dir));
        }
    }

    /** @return array<string, mixed> */
    private function respuesta(): array
    {
        return json_decode((string)$this->_response->getBody(), true, flags: JSON_THROW_ON_ERROR);
    }

    private function conSesion(): void
    {
        $this->session(['Panel' => 1]);
        $this->enableCsrfToken();
    }

    /** JPEG de prueba de $ancho × $alto, como el que mandaría el panel. */
    private function foto(int $ancho = 1200, int $alto = 1600): UploadedFile
    {
        $img = imagecreatetruecolor($ancho, $alto);
        imagefill($img, 0, 0, (int)imagecolorallocate($img, 220, 180, 170));
        $ruta = TMP . 'tests' . DS . 'subida-' . bin2hex(random_bytes(4)) . '.jpg';
        imagejpeg($img, $ruta, 90);

        return new UploadedFile($ruta, (int)filesize($ruta), UPLOAD_ERR_OK, 'foto.jpg', 'image/jpeg');
    }

    public function testSinSesionResponde401(): void
    {
        $this->get('/admin/catalogo');

        $this->assertResponseCode(401);
        $this->assertContentType('application/json');
    }

    public function testIndexIncluyeLosOcultos(): void
    {
        $this->conSesion();
        $this->get('/admin/catalogo');

        $this->assertResponseOk();
        $datos = $this->respuesta();
        $this->assertSame(['NI-02', 'NI-05', 'NI-40', 'NI-41'], array_column($datos['trabajos'], 'codigo'));
        $oculto = $datos['trabajos'][2];
        $this->assertFalse($oculto['visible']);
        $this->assertSame('clasicos', $oculto['categoria']);
        $this->assertSame(3, $oculto['id']);
        $this->assertCount(2, $datos['categorias']);
    }

    public function testEditarCambiaTextoCategoriaYVisibilidad(): void
    {
        $this->conSesion();
        $this->patch('/admin/trabajos/1', [
            'titulo' => '  Nude con brillo ',
            'categoria' => 'brillo',
            'visible' => 'false',
            'destacado' => true,
        ]);

        $this->assertResponseOk();
        $t = $this->respuesta()['trabajo'];
        $this->assertSame('Nude con brillo', $t['titulo']);
        $this->assertSame('brillo', $t['categoria']);
        $this->assertFalse($t['visible']);
        $this->assertTrue($t['destacado']);
        // No se puede cambiar el código ni la foto por aquí.
        $this->assertSame('NI-05', $t['codigo']);
    }

    public function testEditarConDatosInvalidosResponde422ConMensajes(): void
    {
        $this->conSesion();
        $this->patch('/admin/trabajos/1', ['titulo' => '', 'categoria' => 'no-existe']);

        $this->assertResponseCode(422);
        $errores = $this->respuesta()['errores'];
        $this->assertArrayHasKey('titulo', $errores);
        $this->assertSame('Esa categoría no existe.', $errores['categoria']);
    }

    public function testCambiarElOrden(): void
    {
        $this->conSesion();
        $this->put('/admin/trabajos/orden', ['ids' => [4, 1]]);

        $this->assertResponseOk();
        // Los que no vienen quedan al final, en su orden de antes.
        $this->assertSame(['NI-41', 'NI-05', 'NI-02', 'NI-40'], array_column($this->respuesta()['trabajos'], 'codigo'));
    }

    public function testElOrdenConUnIdQueNoExisteSeRechaza(): void
    {
        $this->conSesion();
        $this->put('/admin/trabajos/orden', ['ids' => [1, 999]]);

        $this->assertResponseCode(422);
    }

    public function testSubirUnDisenoNuevo(): void
    {
        $this->conSesion();
        $this->post('/admin/trabajos', [
            'foto' => $this->foto(),
            'titulo' => 'Francés con brillo',
            'alt' => 'Uñas almendradas con francés y brillo.',
            'categoria' => 'brillo',
            'destacado' => '1',
        ]);

        $this->assertResponseCode(201);
        $t = $this->respuesta()['trabajo'];
        $this->assertSame('NI-42', $t['codigo']);
        $this->assertSame('brillo', $t['categoria']);
        $this->assertTrue($t['visible']);
        $this->assertSame([480, 960, 1200], $t['imagen']['widths']);
        $this->assertSame([1200, 1600], [$t['imagen']['width'], $t['imagen']['height']]);
        $this->assertMatchesRegularExpression('#^/fotos/trabajos/web/ni-42-[0-9a-f]{4}$#', $t['imagen']['base']);

        // Primero en el catálogo.
        $this->get('/catalogo');
        $this->assertSame('NI-42', $this->respuesta()['trabajos'][0]['id']);

        $nombre = basename($t['imagen']['base']);
        foreach ([480, 960, 1200] as $w) {
            $archivo = "{$this->dir}/web/{$nombre}-{$w}.webp";
            $this->assertFileExists($archivo);
            $this->assertSame($w, getimagesize($archivo)[0]);
        }
        $og = getimagesize("{$this->dir}/og/{$nombre}.jpg");
        $this->assertSame([800, 1067], [$og[0], $og[1]]);
    }

    public function testNoReusaElCodigoDeUnDisenoBorrado(): void
    {
        $this->conSesion();
        $this->post('/admin/trabajos', ['foto' => $this->foto(), 'titulo' => 'Uno', 'alt' => 'Uñas.']);
        $id = $this->respuesta()['trabajo']['id'];
        $this->conSesion();
        $this->delete("/admin/trabajos/{$id}");
        $this->conSesion();
        $this->post('/admin/trabajos', ['foto' => $this->foto(), 'titulo' => 'Dos', 'alt' => 'Uñas.']);

        $this->assertSame('NI-43', $this->respuesta()['trabajo']['codigo']);
    }

    public function testSubirSinFotoOConUnArchivoQueNoEsFoto(): void
    {
        $this->conSesion();
        $this->post('/admin/trabajos', ['titulo' => '', 'alt' => 'Uñas.']);
        $this->assertResponseCode(422);
        $errores = $this->respuesta()['errores'];
        $this->assertSame('Elige una foto del diseño.', $errores['foto']);
        $this->assertArrayHasKey('titulo', $errores);

        $ruta = TMP . 'tests' . DS . 'no-es-foto.txt';
        file_put_contents($ruta, 'hola');
        $this->conSesion();
        $this->post('/admin/trabajos', [
            'foto' => new UploadedFile($ruta, 4, UPLOAD_ERR_OK, 'foto.jpg', 'image/jpeg'),
            'titulo' => 'Algo',
            'alt' => 'Uñas.',
        ]);
        $this->assertResponseCode(422);
        $this->assertSame('Ese archivo no es una foto JPG, PNG o WebP.', $this->respuesta()['errores']['foto']);
        $this->assertDirectoryDoesNotExist($this->dir . '/web');
    }

    public function testUnaFotoMuyPequenaSeRechaza(): void
    {
        $this->conSesion();
        $this->post('/admin/trabajos', ['foto' => $this->foto(300, 400), 'titulo' => 'Chica', 'alt' => 'Uñas.']);

        $this->assertResponseCode(422);
        $this->assertStringContainsString('muy pequeña', $this->respuesta()['errores']['foto']);
    }

    public function testBorrarQuitaElDisenoYSusArchivos(): void
    {
        $this->conSesion();
        $this->post('/admin/trabajos', ['foto' => $this->foto(), 'titulo' => 'Temporal', 'alt' => 'Uñas.']);
        $t = $this->respuesta()['trabajo'];
        $this->assertCount(4, glob($this->dir . '/*/' . basename($t['imagen']['base']) . '*'));

        $this->conSesion();
        $this->delete("/admin/trabajos/{$t['id']}");
        $this->assertResponseOk();
        $this->assertCount(0, glob($this->dir . '/*/' . basename($t['imagen']['base']) . '*'));

        // Las fotos del repositorio (otra ruta) no se tocan al borrar.
        $this->conSesion();
        $this->delete('/admin/trabajos/1');
        $this->assertResponseOk();
    }

    public function testSinTokenCsrfNoSeModificaNada(): void
    {
        $this->session(['Panel' => 1]);
        $this->delete('/admin/trabajos/1');

        $this->assertResponseCode(403);
        $this->assertTrue($this->getTableLocator()->get('Trabajos')->exists(['id' => 1]));
    }
}
