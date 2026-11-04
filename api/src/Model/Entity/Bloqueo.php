<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * @property int $id
 * @property \Cake\I18n\Date $fecha
 * @property \Cake\I18n\Time|null $hora NULL bloquea el día completo.
 * @property string|null $motivo
 * @property \Cake\I18n\DateTime|null $created
 */
class Bloqueo extends Entity
{
    protected array $_accessible = [
        'fecha' => true,
        'hora' => true,
        'motivo' => true,
    ];

    /**
     * Si bloquea el día completo.
     *
     * @return bool
     */
    public function diaCompleto(): bool
    {
        return $this->hora === null;
    }
}
