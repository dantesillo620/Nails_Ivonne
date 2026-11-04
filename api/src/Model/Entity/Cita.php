<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * @property int $id
 * @property string $nombre
 * @property string $telefono Solo dígitos, con código de país.
 * @property \Cake\I18n\Date $fecha
 * @property \Cake\I18n\Time $hora
 * @property string $estado
 * @property bool|null $ocupa
 * @property string|null $nota
 * @property \Cake\I18n\DateTime|null $created
 * @property \Cake\I18n\DateTime|null $modified
 * @property array<\App\Model\Entity\Trabajo> $trabajos
 */
class Cita extends Entity
{
    public const PENDIENTE = 'pendiente';
    public const CONFIRMADA = 'confirmada';
    public const CANCELADA = 'cancelada';

    public const ESTADOS = [self::PENDIENTE, self::CONFIRMADA, self::CANCELADA];

    /**
     * Lo que puede mandar la clienta. 'estado' lo cambia solo Ivonne desde el panel
     * y 'ocupa' se calcula al guardar (CitasTable::beforeSave()).
     */
    protected array $_accessible = [
        'nombre' => true,
        'telefono' => true,
        'fecha' => true,
        'hora' => true,
        'nota' => true,
        'trabajos' => true,
    ];

    /**
     * Lo que se le devuelve a la clienta al apartar (sin datos de otras citas).
     *
     * @return array{id: int, fecha: string, hora: string, estado: string}
     */
    public function aPublico(): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->fecha->format('Y-m-d'),
            'hora' => $this->hora->format('H:i'),
            'estado' => $this->estado,
        ];
    }

    /**
     * Forma que usa el panel. Requiere los diseños cargados con contain().
     *
     * @return array<string, mixed>
     */
    public function aPanel(): array
    {
        return $this->aPublico() + [
            'nombre' => $this->nombre,
            'telefono' => $this->telefono,
            'nota' => $this->nota,
            'disenos' => array_map(fn(Trabajo $t) => [
                'id' => $t->id,
                'codigo' => $t->codigo,
                'titulo' => $t->titulo,
                'imagen' => [
                    'base' => $t->imagen_base,
                    'width' => $t->imagen_ancho,
                    'height' => $t->imagen_alto,
                    'widths' => $t->anchos(),
                ],
            ], $this->trabajos ?? []),
            'creada' => $this->created?->toIso8601String(),
        ];
    }

    /**
     * Si la cita ocupa su horario.
     *
     * @return bool
     */
    public function activa(): bool
    {
        return $this->estado !== self::CANCELADA;
    }
}
