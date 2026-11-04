<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class AjustesFixture extends TestFixture
{
    public const ENTRE_SEMANA = ['14:00', '16:00', '18:00', '20:00'];
    public const SABADO = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];

    public function init(): void
    {
        $this->records = [
            [
                'clave' => 'agenda',
                'valor' => [
                    'zonaHoraria' => 'America/Mexico_City',
                    'horas' => [
                        '1' => self::ENTRE_SEMANA,
                        '2' => self::ENTRE_SEMANA,
                        '3' => self::ENTRE_SEMANA,
                        '4' => self::ENTRE_SEMANA,
                        '5' => self::ENTRE_SEMANA,
                        '6' => self::SABADO,
                    ],
                    'semanas' => 2,
                    'anticipacionMinutos' => 60,
                ],
                'modified' => '2026-11-04 12:00:00',
            ],
        ];
        parent::init();
    }
}
