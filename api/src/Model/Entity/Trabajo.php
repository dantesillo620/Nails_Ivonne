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
     * Ruta de la página del diseño: 'NI-25' -> '/disenos/ni-25' (rutaDiseno() del front).
     *
     * @return string
     */
    public function ruta(): string
    {
        return '/disenos/' . strtolower($this->codigo);
    }

    /**
     * JPEG para la vista previa en WhatsApp y redes, con la misma regla que
     * imagenCompartir() del front: '/images/trabajos/web/ni-25' -> '/images/trabajos/og/ni-25.jpg'.
     *
     * @return array{src: string, width: int, height: int}
     */
    public function imagenCompartir(): array
    {
        $ancho = min(800, $this->imagen_ancho);

        return [
            'src' => preg_replace('#/web/([^/]+)$#', '/og/$1', $this->imagen_base) . '.jpg',
            'width' => $ancho,
            'height' => (int)round($this->imagen_alto * $ancho / $this->imagen_ancho),
        ];
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

    /**
     * Forma que usa el panel: incluye el id interno, si está visible y su orden.
     * Requiere la categoría cargada con contain().
     *
     * @return array<string, mixed>
     */
    public function aPanel(): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'titulo' => $this->titulo,
            'alt' => $this->alt,
            'categoria' => $this->categoria?->slug,
            'destacado' => $this->destacado,
            'visible' => $this->visible,
            'orden' => $this->orden,
            'imagen' => [
                'base' => $this->imagen_base,
                'width' => $this->imagen_ancho,
                'height' => $this->imagen_alto,
                'widths' => $this->anchos(),
            ],
            'modificado' => $this->modified?->toIso8601String(),
        ];
    }
}
