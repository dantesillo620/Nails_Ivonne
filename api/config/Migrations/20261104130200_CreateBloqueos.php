<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/**
 * Días u horarios en que Ivonne no atiende (vacaciones, descanso, un pendiente).
 * 'hora' NULL bloquea el día completo.
 */
class CreateBloqueos extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('bloqueos')
            ->addColumn('fecha', 'date', ['null' => false])
            ->addColumn('hora', 'time', ['null' => true, 'default' => null])
            ->addColumn('motivo', 'string', ['limit' => 120, 'null' => true, 'default' => null])
            ->addColumn('created', 'datetime', ['null' => true, 'default' => null])
            ->addIndex(['fecha'])
            ->create();
    }
}
