<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * @property int $id
 * @property string $slug
 * @property string $nombre
 * @property int $orden
 */
class Categoria extends Entity
{
    protected array $_accessible = [
        'slug' => true,
        'nombre' => true,
        'orden' => true,
    ];

    /**
     * Forma que usa el sitio (interfaz Categoria de src/app/data/trabajos.ts).
     *
     * @return array{id: string, nombre: string}
     */
    public function aPublico(): array
    {
        return ['id' => $this->slug, 'nombre' => $this->nombre];
    }
}
