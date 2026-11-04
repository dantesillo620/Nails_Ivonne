<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\Database\Schema\TableSchemaInterface;
use Cake\ORM\Table;

/**
 * Ajustes guardados como JSON por clave.
 *
 * @method \App\Model\Entity\Ajuste newEmptyEntity()
 */
class AjustesTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('ajustes');
        $this->setPrimaryKey('clave');
        $this->addBehavior('Timestamp', ['events' => ['Model.beforeSave' => ['modified' => 'always']]]);
    }

    /**
     * En SQLite (pruebas) la columna no es JSON nativo; así se decodifica igual que en MySQL.
     *
     * @return \Cake\Database\Schema\TableSchemaInterface
     */
    public function getSchema(): TableSchemaInterface
    {
        return parent::getSchema()->setColumnType('valor', 'json');
    }

    /**
     * Valor de un ajuste, o $predeterminado si no existe.
     *
     * @param string $clave Clave del ajuste.
     * @param array<string, mixed> $predeterminado Valor si no existe.
     * @return array<string, mixed>
     */
    public function leer(string $clave, array $predeterminado = []): array
    {
        /** @var \App\Model\Entity\Ajuste|null $ajuste */
        $ajuste = $this->find()->where(['clave' => $clave])->first();

        return $ajuste?->valor ?? $predeterminado;
    }

    /**
     * Crea o reemplaza un ajuste.
     *
     * @param string $clave Clave del ajuste.
     * @param array<string, mixed> $valor Valor nuevo.
     * @return void
     */
    public function guardar(string $clave, array $valor): void
    {
        $ajuste = $this->find()->where(['clave' => $clave])->first() ?? $this->newEntity(['clave' => $clave]);
        $ajuste->set('valor', $valor);
        $this->saveOrFail($ajuste);
    }
}
