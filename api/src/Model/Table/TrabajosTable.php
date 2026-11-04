<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Query\SelectQuery;
use Cake\ORM\RulesChecker;
use Cake\ORM\Table;
use Cake\Validation\Validator;

/**
 * @property \App\Model\Table\CategoriasTable&\Cake\ORM\Association\BelongsTo $Categorias
 * @method \App\Model\Entity\Trabajo newEmptyEntity()
 * @method \App\Model\Entity\Trabajo get(mixed $primaryKey, array|string $finder = 'all', \Psr\SimpleCache\CacheInterface|string|null $cache = null, \Closure|string|null $cacheKey = null, mixed ...$args)
 */
class TrabajosTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('trabajos');
        $this->setDisplayField('titulo');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Categorias');
    }

    /**
     * @inheritDoc
     */
    public function validationDefault(Validator $validator): Validator
    {
        return $validator
            ->scalar('codigo')
            ->regex('codigo', '/^[A-Z]{2,4}-\d{2,4}$/', "Usa el formato 'NI-07'.")
            ->requirePresence('codigo', 'create')
            ->notEmptyString('codigo')
            ->scalar('titulo')
            ->maxLength('titulo', 120)
            ->requirePresence('titulo', 'create')
            ->notEmptyString('titulo')
            ->scalar('alt')
            ->maxLength('alt', 255)
            ->requirePresence('alt', 'create')
            ->notEmptyString('alt', 'Describe la foto para quien no puede verla.')
            ->allowEmptyString('categoria_id')
            ->boolean('destacado')
            ->boolean('visible')
            ->integer('orden')
            ->scalar('imagen_base')
            ->requirePresence('imagen_base', 'create')
            ->notEmptyString('imagen_base')
            ->naturalNumber('imagen_ancho')
            ->requirePresence('imagen_ancho', 'create')
            ->naturalNumber('imagen_alto')
            ->requirePresence('imagen_alto', 'create')
            ->regex('imagen_anchos', '/^\d+(,\d+)*$/')
            ->requirePresence('imagen_anchos', 'create');
    }

    /**
     * @inheritDoc
     */
    public function buildRules(RulesChecker $rules): RulesChecker
    {
        $rules->add($rules->isUnique(['codigo'], 'Ya existe un diseño con ese código.'));
        $rules->add($rules->existsIn(['categoria_id'], 'Categorias'), ['errorField' => 'categoria_id']);

        return $rules;
    }

    /** Diseños que se muestran en el sitio, en el orden del catálogo. */
    public function findPublicos(SelectQuery $query): SelectQuery
    {
        return $query
            ->contain(['Categorias'])
            ->where(['Trabajos.visible' => true])
            ->orderBy(['Trabajos.orden' => 'ASC', 'Trabajos.id' => 'ASC']);
    }

    /** Busca por código sin importar mayúsculas ('ni-25' o 'NI-25'). */
    public function findPorCodigo(SelectQuery $query, string $codigo): SelectQuery
    {
        return $query->where(['Trabajos.codigo' => strtoupper($codigo)]);
    }
}
