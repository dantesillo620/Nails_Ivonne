<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Query\SelectQuery;
use Cake\ORM\Table;
use Cake\Validation\Validator;

/**
 * @property \App\Model\Table\TrabajosTable&\Cake\ORM\Association\HasMany $Trabajos
 * @method \App\Model\Entity\Categoria newEmptyEntity()
 * @method \App\Model\Entity\Categoria get(mixed $primaryKey, array|string $finder = 'all', \Psr\SimpleCache\CacheInterface|string|null $cache = null, \Closure|string|null $cacheKey = null, mixed ...$args)
 */
class CategoriasTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('categorias');
        $this->setDisplayField('nombre');
        $this->hasMany('Trabajos');
    }

    /**
     * @inheritDoc
     */
    public function validationDefault(Validator $validator): Validator
    {
        return $validator
            ->scalar('slug')
            ->maxLength('slug', 40)
            ->regex('slug', '/^[a-z0-9-]+$/', 'Solo minúsculas, números y guiones.')
            ->requirePresence('slug', 'create')
            ->notEmptyString('slug')
            ->scalar('nombre')
            ->maxLength('nombre', 80)
            ->requirePresence('nombre', 'create')
            ->notEmptyString('nombre')
            ->integer('orden');
    }

    /**
     * Categorías en el orden en que se muestran los filtros del catálogo.
     *
     * @param \Cake\ORM\Query\SelectQuery $query Consulta.
     * @return \Cake\ORM\Query\SelectQuery
     */
    public function findOrdenadas(SelectQuery $query): SelectQuery
    {
        return $query->orderBy(['Categorias.orden' => 'ASC', 'Categorias.id' => 'ASC']);
    }
}
