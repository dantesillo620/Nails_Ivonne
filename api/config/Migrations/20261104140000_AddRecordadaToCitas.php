<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/**
 * Cuándo se le recordó a Ivonne la cita (bin/cake agenda recordatorios), para no repetir el aviso.
 */
class AddRecordadaToCitas extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('citas')
            ->addColumn('recordada', 'datetime', ['null' => true, 'default' => null, 'after' => 'nota'])
            ->update();
    }
}
