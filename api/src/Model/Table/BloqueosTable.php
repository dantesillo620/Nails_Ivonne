<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Query\SelectQuery;
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
     * Bloqueos entre dos fechas (incluidas), en orden.
     *
     * @param \Cake\ORM\Query\SelectQuery $query Consulta.
     * @param string $desde 'AAAA-MM-DD'.
     * @param string $hasta 'AAAA-MM-DD'.
     * @return \Cake\ORM\Query\SelectQuery
     */
    public function findEntre(SelectQuery $query, string $desde, string $hasta): SelectQuery
    {
        return $query
            ->where(['Bloqueos.fecha >=' => $desde, 'Bloqueos.fecha <=' => $hasta])
            ->orderBy(['Bloqueos.fecha' => 'ASC', 'Bloqueos.hora' => 'ASC']);
    }

    /**
     * Si un bloqueo impide ese horario (el día completo o esa hora).
     *
     * @param string $fecha 'AAAA-MM-DD'.
     * @param string $hora 'HH:MM'.
     * @return bool
     */
    public function bloquea(string $fecha, string $hora): bool
    {
        return $this->exists([
            'Bloqueos.fecha' => $fecha,
            'OR' => ['Bloqueos.hora IS' => null, 'Bloqueos.hora' => $hora . ':00'],
        ]);
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
