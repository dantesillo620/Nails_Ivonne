<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class CitasFixture extends TestFixture
{
    public function init(): void
    {
        $this->records = [
            [
                'id' => 1,
                'nombre' => 'Ana',
                'telefono' => '13855550101',
                'fecha' => '2026-11-10',
                'hora' => '16:00:00',
                'estado' => 'confirmada',
                'ocupa' => true,
                'nota' => null,
                'created' => '2026-11-04 12:00:00',
                'modified' => '2026-11-04 12:00:00',
            ],
            [
                'id' => 2,
                'nombre' => 'Bety',
                'telefono' => '13855550102',
                'fecha' => '2026-11-10',
                'hora' => '18:00:00',
                'estado' => 'cancelada',
                'ocupa' => null,
                'nota' => null,
                'created' => '2026-11-04 12:00:00',
                'modified' => '2026-11-04 12:00:00',
            ],
        ];
        parent::init();
    }
}
