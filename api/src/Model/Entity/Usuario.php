<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

/**
 * Cuenta del panel de administración.
 *
 * @property int $id
 * @property string $email
 * @property string $nombre
 * @property string $password Hash; nunca se incluye al convertir a JSON.
 * @property \Cake\I18n\DateTime|null $created
 * @property \Cake\I18n\DateTime|null $modified
 */
class Usuario extends Entity
{
    protected array $_accessible = [
        'email' => true,
        'nombre' => true,
        'password' => true,
    ];

    protected array $_hidden = ['password'];

    /**
     * Guarda la contraseña como hash (bcrypt/argon según PHP), compatible con
     * el DefaultPasswordHasher del plugin de autenticación de CakePHP.
     *
     * @param string $password Contraseña en texto plano.
     * @return string
     */
    protected function _setPassword(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }
}
