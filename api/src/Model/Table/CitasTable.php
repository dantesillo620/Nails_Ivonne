<?php
declare(strict_types=1);

namespace App\Model\Table;

use App\Model\Entity\Cita;
use ArrayObject;
use Cake\Datasource\EntityInterface;
use Cake\Event\EventInterface;
use Cake\ORM\RulesChecker;
use Cake\ORM\Table;
use Cake\Validation\Validator;

/**
 * @property \App\Model\Table\TrabajosTable&\Cake\ORM\Association\BelongsToMany $Trabajos
 * @method \App\Model\Entity\Cita newEmptyEntity()
 * @method \App\Model\Entity\Cita newEntity(array $data, array $options = [])
 */
class CitasTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('citas');
        $this->setDisplayField('nombre');
        $this->addBehavior('Timestamp');
        $this->belongsToMany('Trabajos', ['through' => 'CitasTrabajos']);
    }

    /**
     * Deja el teléfono solo con dígitos y recorta espacios antes de validar.
     *
     * @param \Cake\Event\EventInterface $event Evento.
     * @param \ArrayObject<string, mixed> $data Datos recibidos.
     * @param \ArrayObject<string, mixed> $options Opciones.
     * @return void
     */
    public function beforeMarshal(EventInterface $event, ArrayObject $data, ArrayObject $options): void
    {
        if (isset($data['telefono']) && is_string($data['telefono'])) {
            $data['telefono'] = preg_replace('/\D/', '', $data['telefono']);
        }
        foreach (['nombre', 'nota'] as $campo) {
            if (isset($data[$campo]) && is_string($data[$campo])) {
                $data[$campo] = trim($data[$campo]);
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function validationDefault(Validator $validator): Validator
    {
        return $validator
            ->scalar('nombre')
            ->maxLength('nombre', 80)
            ->requirePresence('nombre', 'create')
            ->notEmptyString('nombre', 'Escribe tu nombre.')
            ->scalar('telefono')
            ->requirePresence('telefono', 'create')
            ->notEmptyString('telefono', 'Escribe tu WhatsApp.')
            ->lengthBetween('telefono', [8, 15], 'Revisa el número: incluye la lada.')
            ->date('fecha', ['ymd'])
            ->requirePresence('fecha', 'create')
            ->time('hora')
            ->requirePresence('hora', 'create')
            ->inList('estado', Cita::ESTADOS)
            ->scalar('nota')
            ->maxLength('nota', 500)
            ->allowEmptyString('nota');
    }

    /**
     * @inheritDoc
     */
    public function buildRules(RulesChecker $rules): RulesChecker
    {
        $rules->add(
            $rules->isUnique(['fecha', 'hora', 'ocupa'], [
                'allowMultipleNulls' => true,
                'message' => 'Ese horario ya está apartado.',
            ]),
            ['errorField' => 'hora'],
        );

        return $rules;
    }

    /**
     * Calcula 'ocupa' antes de las reglas, para que la de horario único lo considere.
     *
     * @param \Cake\Event\EventInterface $event Evento.
     * @param \App\Model\Entity\Cita $entity Cita.
     * @param \ArrayObject<string, mixed> $options Opciones.
     * @param string $operation 'create' o 'update'.
     * @return void
     */
    public function beforeRules(
        EventInterface $event,
        EntityInterface $entity,
        ArrayObject $options,
        string $operation,
    ): void {
        if ($entity->isNew() && $entity->get('estado') === null) {
            $entity->set('estado', Cita::PENDIENTE);
        }
        $entity->set('ocupa', $entity->activa() ? true : null);
    }
}
