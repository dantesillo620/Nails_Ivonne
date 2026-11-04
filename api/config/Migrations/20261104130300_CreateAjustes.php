<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/**
 * Ajustes que Ivonne podrá cambiar desde el panel, guardados como JSON por clave
 * (p. ej. 'agenda': días, horas, semanas visibles, anticipación y zona horaria).
 */
class CreateAjustes extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('ajustes', ['id' => false, 'primary_key' => ['clave']])
            ->addColumn('clave', 'string', ['limit' => 60, 'null' => false])
            ->addColumn('valor', 'json', ['null' => false])
            ->addColumn('modified', 'datetime', ['null' => true, 'default' => null])
            ->create();
    }
}
