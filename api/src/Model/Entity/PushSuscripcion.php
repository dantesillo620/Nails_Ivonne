<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * Un dispositivo que recibe notificaciones del panel.
 *
 * @property int $id
 * @property int $usuario_id
 * @property string $endpoint
 * @property string $p256dh
 * @property string $auth
 * @property string|null $dispositivo
 * @property \Cake\I18n\DateTime|null $created
 */
class PushSuscripcion extends Entity
{
    protected array $_accessible = [
        'endpoint' => true,
        'p256dh' => true,
        'auth' => true,
        'dispositivo' => true,
    ];

    protected array $_hidden = ['p256dh', 'auth'];
}
