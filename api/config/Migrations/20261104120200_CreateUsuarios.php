<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/** Cuentas del panel de administración (por ahora solo Ivonne). */
class CreateUsuarios extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('usuarios')
            ->addColumn('email', 'string', ['limit' => 190, 'null' => false])
            ->addColumn('nombre', 'string', ['limit' => 80, 'null' => false])
            ->addColumn('password', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('created', 'datetime', ['null' => true, 'default' => null])
            ->addColumn('modified', 'datetime', ['null' => true, 'default' => null])
            ->addIndex(['email'], ['unique' => true])
            ->create();
    }
}
