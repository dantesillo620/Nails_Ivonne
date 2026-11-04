<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/** Diseños que la clienta eligió para su cita. */
class CreateCitasTrabajos extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('citas_trabajos', ['id' => false, 'primary_key' => ['cita_id', 'trabajo_id']])
            ->addColumn('cita_id', 'integer', ['null' => false])
            ->addColumn('trabajo_id', 'integer', ['null' => false])
            ->addIndex(['trabajo_id'])
            ->addForeignKey('cita_id', 'citas', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('trabajo_id', 'trabajos', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();
    }
}
