<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class AjustesFixture extends TestFixture
{
    public array $records = [
        [
            'clave' => 'agenda',
            'valor' => ['dias' => [1, 2, 3, 4, 5, 6], 'horas' => ['16:00', '18:00'], 'semanas' => 2],
            'modified' => '2026-11-04 12:00:00',
        ],
    ];
}
