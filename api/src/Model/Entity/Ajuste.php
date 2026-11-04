<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * @property string $clave
 * @property array<string, mixed> $valor
 * @property \Cake\I18n\DateTime|null $modified
 */
class Ajuste extends Entity
{
    protected array $_accessible = [
        'clave' => true,
        'valor' => true,
    ];
}
