<?php
declare(strict_types=1);

namespace App\Model\Table;

use App\Model\Entity\Cita;
use ArrayObject;
use Cake\Datasource\EntityInterface;
use Cake\Event\EventInterface;
use Cake\ORM\Query\SelectQuery;
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
     * Deja el teléfono en formato internacional (solo dígitos, como lo usa wa.me) y recorta
     * espacios antes de validar. El estudio está en Guadalajara: un número de 10 dígitos sin
     * lada de país se toma como de México (52). Con '+' adelante se respeta el país escrito.
     *
     * @param string $telefono Lo que escribió la clienta.
     * @return string
     */
    public static function normalizarTelefono(string $telefono): string
    {
        $digitos = (string)preg_replace('/\D/', '', $telefono);
        if (str_starts_with(ltrim($telefono), '+')) {
            return $digitos;
        }

        return strlen($digitos) === 10 ? '52' . $digitos : $digitos;
    }

    /**
     * Normaliza el teléfono y recorta espacios antes de validar.
     *
     * @param \Cake\Event\EventInterface $event Evento.
     * @param \ArrayObject<string, mixed> $data Datos recibidos.
     * @param \ArrayObject<string, mixed> $options Opciones.
     * @return void
     */
    public function beforeMarshal(EventInterface $event, ArrayObject $data, ArrayObject $options): void
    {
        if (isset($data['telefono']) && is_string($data['telefono'])) {
            $data['telefono'] = self::normalizarTelefono($data['telefono']);
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
            ->lengthBetween('telefono', [10, 15], 'Revisa el número: escribe los 10 dígitos con lada.')
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
     * Citas pendientes o confirmadas entre dos fechas (incluidas), en orden.
     *
     * @param \Cake\ORM\Query\SelectQuery $query Consulta.
     * @param string $desde 'AAAA-MM-DD'.
     * @param string $hasta 'AAAA-MM-DD'.
     * @return \Cake\ORM\Query\SelectQuery
     */
    public function findActivasEntre(SelectQuery $query, string $desde, string $hasta): SelectQuery
    {
        return $this->findEntre($query, $desde, $hasta)->where(['Citas.ocupa' => true]);
    }

    /**
     * Todas las citas entre dos fechas (incluidas), también canceladas, en orden.
     *
     * @param \Cake\ORM\Query\SelectQuery $query Consulta.
     * @param string $desde 'AAAA-MM-DD'.
     * @param string $hasta 'AAAA-MM-DD'.
     * @return \Cake\ORM\Query\SelectQuery
     */
    public function findEntre(SelectQuery $query, string $desde, string $hasta): SelectQuery
    {
        return $query
            ->where(['Citas.fecha >=' => $desde, 'Citas.fecha <=' => $hasta])
            ->orderBy(['Citas.fecha' => 'ASC', 'Citas.hora' => 'ASC', 'Citas.id' => 'ASC']);
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
