<?php
declare(strict_types=1);

use Migrations\BaseSeed;

/**
 * Carga el catálogo inicial desde config/seeds/catalogo.json
 * (exportado de src/app/data/trabajos.ts del front).
 *
 *   bin/cake seeds run Catalogo
 *
 * Omite las categorías y los diseños que ya existen, así que se puede repetir con --force.
 */
class CatalogoSeed extends BaseSeed
{
    /**
     * @inheritDoc
     */
    public function run(): void
    {
        $json = file_get_contents(CONFIG . 'seeds' . DS . 'catalogo.json');
        $datos = json_decode((string)$json, true, flags: JSON_THROW_ON_ERROR);

        foreach ($datos['categorias'] as $categoria) {
            $this->insertOrSkip('categorias', $categoria);
        }

        $ids = [];
        foreach ($this->fetchAll('SELECT id, slug FROM categorias') as $fila) {
            $ids[$fila['slug']] = (int)$fila['id'];
        }

        $ahora = date('Y-m-d H:i:s');
        foreach ($datos['trabajos'] as $trabajo) {
            $slug = $trabajo['categoria'];
            unset($trabajo['categoria']);
            $this->insertOrSkip('trabajos', $trabajo + [
                'categoria_id' => $slug !== null ? ($ids[$slug] ?? null) : null,
                'visible' => true,
                'created' => $ahora,
                'modified' => $ahora,
            ]);
        }
    }
}
