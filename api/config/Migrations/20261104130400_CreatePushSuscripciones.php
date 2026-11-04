<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/**
 * Dispositivos de una cuenta del panel que aceptaron notificaciones (Web Push).
 * 'endpoint', 'p256dh' y 'auth' son los datos que entrega el navegador al suscribirse.
 */
class CreatePushSuscripciones extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('push_suscripciones')
            ->addColumn('usuario_id', 'integer', ['null' => false])
            ->addColumn('endpoint', 'string', ['limit' => 500, 'null' => false])
            ->addColumn('p256dh', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('auth', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('dispositivo', 'string', ['limit' => 255, 'null' => true, 'default' => null])
            ->addColumn('created', 'datetime', ['null' => true, 'default' => null])
            ->addIndex(['endpoint'], ['unique' => true])
            ->addIndex(['usuario_id'])
            ->addForeignKey('usuario_id', 'usuarios', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();
    }
}
