<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\RulesChecker;
use Cake\ORM\Table;
use Cake\Validation\Validator;

/**
 * @method \App\Model\Entity\Bloqueo newEmptyEntity()
 * @method \App\Model\Entity\Bloqueo newEntity(array $data, array $options = [])
 */
class BloqueosTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('bloqueos');
        $this->addBehavior('Timestamp', ['events' => ['Model.beforeSave' => ['created' => 'new']]]);
    }

    /**
     * @inheritDoc
     */
    public function validationDefault(Validator $validator): Validator
    {
        return $validator
            ->date('fecha', ['ymd'])
            ->requirePresence('fecha', 'create')
            ->time('hora')
            ->allowEmptyTime('hora')
            ->scalar('motivo')
            ->maxLength('motivo', 120)
            ->allowEmptyString('motivo');
    }

    /**
     * @inheritDoc
     */
    public function buildRules(RulesChecker $rules): RulesChecker
    {
        // Con allowMultipleNulls en false tampoco se repite el bloqueo de día completo (hora NULL).
        $rules->add(
            $rules->isUnique(['fecha', 'hora'], [
                'allowMultipleNulls' => false,
                'message' => 'Ese horario ya está bloqueado.',
            ]),
            ['errorField' => 'hora'],
        );

        return $rules;
    }
}
