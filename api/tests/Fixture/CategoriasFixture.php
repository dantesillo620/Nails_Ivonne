<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class CategoriasFixture extends TestFixture
{
    public function init(): void
    {
        $this->records = [
            ['id' => 1, 'slug' => 'clasicos', 'nombre' => 'Nude y francés', 'orden' => 2],
            ['id' => 2, 'slug' => 'brillo', 'nombre' => 'Brillo y dorado', 'orden' => 1],
        ];
        parent::init();
    }
}
