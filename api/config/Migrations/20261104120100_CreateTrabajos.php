<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/**
 * Diseños del catálogo. La imagen se guarda como en el front:
 * una ruta base ('/images/trabajos/web/ni-02') y los anchos disponibles en WebP
 * separados por coma ('480,960,1440'; archivos '<base>-<ancho>.webp').
 * 'codigo' es el identificador visible ('NI-07') y 'alt' describe la foto para lectores de pantalla.
 * La copia JPEG para compartir vive aparte (ver imagenCompartir() en src/app/data/trabajos.ts).
 */
class CreateTrabajos extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('trabajos')
            ->addColumn('codigo', 'string', ['limit' => 12, 'null' => false])
            ->addColumn('titulo', 'string', ['limit' => 120, 'null' => false])
            ->addColumn('alt', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('categoria_id', 'integer', ['null' => true, 'default' => null])
            ->addColumn('destacado', 'boolean', ['default' => false, 'null' => false])
            ->addColumn('visible', 'boolean', ['default' => true, 'null' => false])
            ->addColumn('orden', 'integer', ['default' => 0, 'null' => false])
            ->addColumn('imagen_base', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('imagen_ancho', 'integer', ['null' => false])
            ->addColumn('imagen_alto', 'integer', ['null' => false])
            ->addColumn('imagen_anchos', 'string', ['limit' => 60, 'null' => false])
            ->addColumn('created', 'datetime', ['null' => true, 'default' => null])
            ->addColumn('modified', 'datetime', ['null' => true, 'default' => null])
            ->addIndex(['codigo'], ['unique' => true])
            ->addIndex(['visible', 'orden'])
            ->addForeignKey('categoria_id', 'categorias', 'id', ['delete' => 'SET_NULL', 'update' => 'CASCADE'])
            ->create();
    }
}
