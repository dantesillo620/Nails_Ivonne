<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

/**
 * Tabla intermedia entre citas y los diseños elegidos.
 *
 * @property \App\Model\Table\CitasTable&\Cake\ORM\Association\BelongsTo $Citas
 * @property \App\Model\Table\TrabajosTable&\Cake\ORM\Association\BelongsTo $Trabajos
 */
class CitasTrabajosTable extends Table
{
    /**
     * @inheritDoc
     */
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('citas_trabajos');
        $this->setPrimaryKey(['cita_id', 'trabajo_id']);
        $this->belongsTo('Citas');
        $this->belongsTo('Trabajos');
    }
}
