<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * @property int $id
 * @property string $codigo
 * @property string $titulo
 * @property string $alt
 * @property int|null $categoria_id
 * @property bool $destacado
 * @property bool $visible
 * @property int $orden
 * @property string $imagen_base
 * @property int $imagen_ancho
 * @property int $imagen_alto
 * @property string $imagen_anchos
 * @property \Cake\I18n\DateTime|null $created
 * @property \Cake\I18n\DateTime|null $modified
 * @property \App\Model\Entity\Categoria|null $categoria
 */
class Trabajo extends Entity
{
    protected array $_accessible = [
        'codigo' => true,
        'titulo' => true,
        'alt' => true,
        'categoria_id' => true,
        'destacado' => true,
        'visible' => true,
        'orden' => true,
        'imagen_base' => true,
        'imagen_ancho' => true,
        'imagen_alto' => true,
        'imagen_anchos' => true,
    ];

    /** @return list<int> */
    public function anchos(): array
    {
        return array_map('intval', explode(',', $this->imagen_anchos));
    }

    /**
     * Forma que usa el sitio (interfaz Trabajo de src/app/data/trabajos.ts).
     * Requiere la categoría cargada con contain() para incluir su slug.
     *
     * @return array<string, mixed>
     */
    public function aPublico(): array
    {
        $datos = [
            'id' => $this->codigo,
            'titulo' => $this->titulo,
            'alt' => $this->alt,
            'imagen' => [
                'base' => $this->imagen_base,
                'width' => $this->imagen_ancho,
                'height' => $this->imagen_alto,
                'widths' => $this->anchos(),
            ],
        ];
        if ($this->categoria !== null) {
            $datos['categoria'] = $this->categoria->slug;
        }
        if ($this->destacado) {
            $datos['destacado'] = true;
        }

        return $datos;
    }
}
