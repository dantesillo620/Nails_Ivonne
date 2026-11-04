<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class TrabajosFixture extends TestFixture
{
    public function init(): void
    {
        $base = [
            'alt' => 'Uñas de prueba.',
            'destacado' => false,
            'visible' => true,
            'imagen_ancho' => 3024,
            'imagen_alto' => 4032,
            'imagen_anchos' => '480,960,1440',
            'created' => '2026-11-04 12:00:00',
            'modified' => '2026-11-04 12:00:00',
        ];
        $this->records = [
            ['id' => 1, 'codigo' => 'NI-05', 'titulo' => 'Nude natural', 'categoria_id' => 1, 'orden' => 2, 'imagen_base' => '/images/trabajos/web/ni-05'] + $base,
            ['id' => 2, 'codigo' => 'NI-02', 'titulo' => 'Vino con dije dorado', 'categoria_id' => 2, 'orden' => 1, 'destacado' => true, 'imagen_base' => '/images/trabajos/web/ni-02'] + $base,
            ['id' => 3, 'codigo' => 'NI-40', 'titulo' => 'Oculto', 'categoria_id' => 1, 'orden' => 3, 'visible' => false, 'imagen_base' => '/images/trabajos/web/ni-40'] + $base,
            ['id' => 4, 'codigo' => 'NI-41', 'titulo' => 'Sin categoría', 'categoria_id' => null, 'orden' => 4, 'imagen_base' => '/images/trabajos/web/ni-41', 'imagen_anchos' => '480,899'] + $base,
        ];
        parent::init();
    }
}
