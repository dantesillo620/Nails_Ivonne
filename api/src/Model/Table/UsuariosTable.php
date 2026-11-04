<?php
declare(strict_types=1);

namespace App\Model\Table;

use ArrayObject;
use Cake\Event\EventInterface;
use Cake\ORM\RulesChecker;
use Cake\ORM\Table;
use Cake\Validation\Validator;

/**
 * @property \App\Model\Table\PushSuscripcionesTable&\Cake\ORM\Association\HasMany $PushSuscripciones
 * @method \App\Model\Entity\Usuario newEmptyEntity()
 * @method \App\Model\Entity\Usuario newEntity(array $data, array $options = [])
 */
class UsuariosTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('usuarios');
        $this->setDisplayField('nombre');
        $this->addBehavior('Timestamp');
        $this->hasMany('PushSuscripciones', ['dependent' => true]);
    }

    /**
     * Normaliza el correo para que el inicio de sesión no dependa de mayúsculas.
     *
     * @param \Cake\Event\EventInterface $event Evento.
     * @param \ArrayObject<string, mixed> $data Datos recibidos.
     * @param \ArrayObject<string, mixed> $options Opciones.
     * @return void
     */
    public function beforeMarshal(EventInterface $event, ArrayObject $data, ArrayObject $options): void
    {
        if (isset($data['email']) && is_string($data['email'])) {
            $data['email'] = strtolower(trim($data['email']));
        }
    }

    /**
     * @inheritDoc
     */
    public function validationDefault(Validator $validator): Validator
    {
        return $validator
            ->email('email')
            ->maxLength('email', 190)
            ->requirePresence('email', 'create')
            ->notEmptyString('email')
            ->scalar('nombre')
            ->maxLength('nombre', 80)
            ->requirePresence('nombre', 'create')
            ->notEmptyString('nombre')
            ->scalar('password')
            ->requirePresence('password', 'create')
            ->minLength('password', 10, 'Usa al menos 10 caracteres.');
    }

    /**
     * @inheritDoc
     */
    public function buildRules(RulesChecker $rules): RulesChecker
    {
        $rules->add($rules->isUnique(['email'], 'Ya existe una cuenta con ese correo.'));

        return $rules;
    }
}
