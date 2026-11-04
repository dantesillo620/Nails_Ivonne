<?php
declare(strict_types=1);

use Migrations\BaseMigration;

/**
 * Citas pedidas desde la agenda del sitio.
 *
 * 'fecha' y 'hora' son la hora local del estudio (zona horaria en ajustes.agenda).
 * 'ocupa' vale 1 mientras la cita está pendiente o confirmada y NULL si se cancela:
 * el índice único (fecha, hora, ocupa) impide dos citas activas en el mismo horario,
 * y como MySQL permite varios NULL, las canceladas no bloquean el horario.
 */
class CreateCitas extends BaseMigration
{
    /**
     * @inheritDoc
     */
    public function change(): void
    {
        $this->table('citas')
            ->addColumn('nombre', 'string', ['limit' => 80, 'null' => false])
            ->addColumn('telefono', 'string', ['limit' => 20, 'null' => false])
            ->addColumn('fecha', 'date', ['null' => false])
            ->addColumn('hora', 'time', ['null' => false])
            ->addColumn('estado', 'string', ['limit' => 12, 'null' => false, 'default' => 'pendiente'])
            ->addColumn('ocupa', 'boolean', ['null' => true, 'default' => true])
            ->addColumn('nota', 'text', ['null' => true, 'default' => null])
            ->addColumn('created', 'datetime', ['null' => true, 'default' => null])
            ->addColumn('modified', 'datetime', ['null' => true, 'default' => null])
            ->addIndex(['fecha', 'hora', 'ocupa'], ['unique' => true, 'name' => 'citas_horario_activo'])
            ->addIndex(['estado', 'fecha'])
            ->create();
    }
}
