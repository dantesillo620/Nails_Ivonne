<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\RulesChecker;
use Cake\ORM\Table;
use Cake\Validation\Validator;

/**
 * @property \App\Model\Table\UsuariosTable&\Cake\ORM\Association\BelongsTo $Usuarios
 * @method \App\Model\Entity\PushSuscripcion newEmptyEntity()
 * @method \App\Model\Entity\PushSuscripcion newEntity(array $data, array $options = [])
 */
class PushSuscripcionesTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('push_suscripciones');
        $this->addBehavior('Timestamp', ['events' => ['Model.beforeSave' => ['created' => 'new']]]);
        $this->belongsTo('Usuarios');
    }

    /**
     * @inheritDoc
     */
    public function validationDefault(Validator $validator): Validator
    {
        return $validator
            ->url('endpoint')
            ->regex('endpoint', '#^https://#', 'El endpoint debe ser https.')
            ->maxLength('endpoint', 500)
            ->requirePresence('endpoint', 'create')
            ->scalar('p256dh')
            ->maxLength('p256dh', 255)
            ->requirePresence('p256dh', 'create')
            ->notEmptyString('p256dh')
            ->scalar('auth')
            ->maxLength('auth', 255)
            ->requirePresence('auth', 'create')
            ->notEmptyString('auth')
            ->scalar('dispositivo')
            ->maxLength('dispositivo', 255)
            ->allowEmptyString('dispositivo');
    }

    /**
     * @inheritDoc
     */
    public function buildRules(RulesChecker $rules): RulesChecker
    {
        $rules->add($rules->isUnique(['endpoint']));
        $rules->add($rules->existsIn(['usuario_id'], 'Usuarios'));

        return $rules;
    }
}
