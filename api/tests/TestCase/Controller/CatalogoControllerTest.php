<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller;

use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class CatalogoControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = ['app.Categorias', 'app.Trabajos'];

    /** @return array<string, mixed> */
    private function respuesta(): array
    {
        return json_decode((string)$this->_response->getBody(), true, flags: JSON_THROW_ON_ERROR);
    }

    public function testIndexDevuelveCategoriasYTrabajosVisiblesEnOrden(): void
    {
        $this->get('/catalogo');

        $this->assertResponseOk();
        $this->assertContentType('application/json');
        $datos = $this->respuesta();

        $this->assertSame(
            [['id' => 'brillo', 'nombre' => 'Brillo y dorado'], ['id' => 'clasicos', 'nombre' => 'Nude y francés']],
            $datos['categorias'],
        );
        $this->assertSame(['NI-02', 'NI-05', 'NI-41'], array_column($datos['trabajos'], 'id'));
    }

    public function testIndexUsaLaFormaDelFront(): void
    {
        $this->get('/catalogo');
        [$destacado, $normal, $sinCategoria] = $this->respuesta()['trabajos'];

        $this->assertSame([
            'id' => 'NI-02',
            'titulo' => 'Vino con dije dorado',
            'alt' => 'Uñas de prueba.',
            'imagen' => [
                'base' => '/images/trabajos/web/ni-02',
                'width' => 3024,
                'height' => 4032,
                'widths' => [480, 960, 1440],
            ],
            'categoria' => 'brillo',
            'destacado' => true,
        ], $destacado);
        $this->assertArrayNotHasKey('destacado', $normal);
        $this->assertArrayNotHasKey('categoria', $sinCategoria);
        $this->assertSame([480, 899], $sinCategoria['imagen']['widths']);
    }

    public function testViewBuscaSinImportarMayusculas(): void
    {
        $this->get('/catalogo/ni-05');

        $this->assertResponseOk();
        $this->assertSame('Nude natural', $this->respuesta()['trabajo']['titulo']);
    }

    public function testViewDeUnDisenoOcultoEs404EnJson(): void
    {
        $this->get('/catalogo/NI-40');

        $this->assertResponseCode(404);
        $this->assertContentType('application/json');
        $this->assertArrayHasKey('message', $this->respuesta());
    }

    public function testEstado(): void
    {
        $this->get('/');

        $this->assertResponseOk();
        $this->assertSame(['ok' => true, 'servicio' => 'Nails Ivonne API'], $this->respuesta());
    }
}
