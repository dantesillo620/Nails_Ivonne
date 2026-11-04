<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class PushSuscripcionesFixture extends TestFixture
{
    public array $records = [
        [
            'id' => 1,
            'usuario_id' => 1,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/celular-de-ivonne',
            'p256dh' => 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
            'auth' => 'tBHItJI5svbpez7KI4CCXg',
            'dispositivo' => 'iPhone',
            'created' => '2026-11-04 12:00:00',
        ],
    ];
}
