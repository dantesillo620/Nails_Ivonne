<?php
declare(strict_types=1);

use Migrations\BaseMigration;

class CreateCategorias extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('categorias')
            ->addColumn('slug', 'string', ['limit' => 40, 'null' => false])
            ->addColumn('nombre', 'string', ['limit' => 80, 'null' => false])
            ->addColumn('orden', 'integer', ['default' => 0, 'null' => false])
            ->addIndex(['slug'], ['unique' => true])
            ->create();
    }
}
