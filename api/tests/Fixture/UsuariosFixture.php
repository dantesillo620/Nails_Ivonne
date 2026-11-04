<?php
declare(strict_types=1);

namespace App\Test\Fixture;

use Cake\TestSuite\Fixture\TestFixture;

class UsuariosFixture extends TestFixture
{
    public const EMAIL = 'ivonne@ejemplo.com';
    public const PASSWORD = 'contrasena-de-prueba';

    public function init(): void
    {
        $this->records = [
            [
                'id' => 1,
                'email' => self::EMAIL,
                'nombre' => 'Ivonne',
                'password' => password_hash(self::PASSWORD, PASSWORD_DEFAULT),
                'created' => '2026-11-04 12:00:00',
                'modified' => '2026-11-04 12:00:00',
            ],
        ];
        parent::init();
    }
}
