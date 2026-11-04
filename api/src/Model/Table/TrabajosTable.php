<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Locator\LocatorAwareTrait;
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
    use LocatorAwareTrait;

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

    /** Todos los diseños, también los ocultos, en el orden del catálogo (para el panel). */
    public function findPanel(SelectQuery $query): SelectQuery
    {
        return $query
            ->contain(['Categorias'])
            ->orderBy(['Trabajos.orden' => 'ASC', 'Trabajos.id' => 'ASC']);
    }

    /**
     * Código para un diseño nuevo: el número más alto usado + 1 ('NI-37').
     * Se recuerda el último entregado (ajustes.catalogo) para no reusar el código de
     * un diseño borrado: alguien podría tener guardado su enlace.
     *
     * @return string
     */
    public function siguienteCodigo(): string
    {
        $ajustes = $this->fetchTable('Ajustes');
        assert($ajustes instanceof AjustesTable);
        $maximo = (int)($ajustes->leer('catalogo')['ultimoNumero'] ?? 0);
        foreach ($this->find()->select(['codigo'])->disableHydration()->all() as $fila) {
            if (preg_match('/^NI-(\d+)$/', (string)$fila['codigo'], $m)) {
                $maximo = max($maximo, (int)$m[1]);
            }
        }
        $siguiente = $maximo + 1;
        $ajustes->guardar('catalogo', ['ultimoNumero' => $siguiente] + $ajustes->leer('catalogo'));

        return sprintf('NI-%02d', $siguiente);
    }

    /**
     * Orden para que un diseño nuevo aparezca primero.
     *
     * @return int
     */
    public function ordenAlInicio(): int
    {
        $minimo = $this->find()->select(['minimo' => $this->find()->func()->min('orden')])
            ->disableHydration()->first();

        return (int)($minimo['minimo'] ?? 1) - 1;
    }

    /** Busca por código sin importar mayúsculas ('ni-25' o 'NI-25'). */
    public function findPorCodigo(SelectQuery $query, string $codigo): SelectQuery
    {
        return $query->where(['Trabajos.codigo' => strtoupper($codigo)]);
    }
}
