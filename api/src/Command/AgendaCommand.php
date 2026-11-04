<?php
declare(strict_types=1);

namespace App\Command;

use App\Agenda\Agenda;
use App\Model\Entity\Cita;
use App\Push\Notificador;
use Cake\Command\Command;
use Cake\Console\Arguments;
use Cake\Console\ConsoleIo;
use Cake\Console\ConsoleOptionParser;

/**
 * Resumen del día para Ivonne, como notificación.
 *
 *   bin/cake agenda resumen
 *
 * Pensado para correr cada mañana con cron (ver api/README.md). Usa el día de Guadalajara,
 * sin importar la zona horaria del servidor. Si no hay citas ni pendientes, no manda nada.
 */
class AgendaCommand extends Command
{
    /**
     * @inheritDoc
     */
    public static function getDescription(): string
    {
        return 'Manda a Ivonne el resumen de las citas de hoy.';
    }

    /**
     * @inheritDoc
     */
    protected function buildOptionParser(ConsoleOptionParser $parser): ConsoleOptionParser
    {
        return $parser
            ->setDescription(static::getDescription())
            ->addArgument('accion', ['help' => 'resumen', 'required' => true, 'choices' => ['resumen']]);
    }

    /**
     * @inheritDoc
     */
    public function execute(Arguments $args, ConsoleIo $io): int
    {
        /** @var \App\Model\Table\AjustesTable $ajustes */
        $ajustes = $this->fetchTable('Ajustes');
        /** @var \App\Model\Table\CitasTable $citas */
        $citas = $this->fetchTable('Citas');
        /** @var \App\Model\Table\PushSuscripcionesTable $suscripciones */
        $suscripciones = $this->fetchTable('PushSuscripciones');

        $hoy = Agenda::desdeAjustes($ajustes)->hoy();
        $deHoy = $citas->find('activasEntre', desde: $hoy, hasta: $hoy)->all()->toList();
        $pendientes = $citas->find()->where(['estado' => Cita::PENDIENTE, 'fecha >=' => $hoy])->count();

        $resumen = self::resumen($deHoy, $pendientes);
        if ($resumen === null) {
            $io->out("Hoy ({$hoy}) no hay citas ni pendientes: no se manda aviso.");

            return static::CODE_SUCCESS;
        }

        $notificador = Notificador::desdeConfig($suscripciones);
        if (!$notificador->configurado()) {
            $io->error('Faltan las claves de push (bin/cake push claves).');

            return static::CODE_ERROR;
        }
        $aviso = Notificador::notificacion($resumen['titulo'], $resumen['cuerpo'], '/admin', 'resumen');
        $r = $notificador->aTodos($aviso);
        $io->out("{$resumen['titulo']} — {$resumen['cuerpo']}");
        $io->out(sprintf('Enviadas: %d · fallidas: %d', $r['enviadas'], $r['fallidas']));

        return static::CODE_SUCCESS;
    }

    /**
     * Título y texto del resumen, o null si no hay nada que avisar.
     *
     * @param list<\App\Model\Entity\Cita> $deHoy Citas activas de hoy, en orden.
     * @param int $pendientes Por confirmar de hoy en adelante.
     * @return array{titulo: string, cuerpo: string}|null
     */
    public static function resumen(array $deHoy, int $pendientes): ?array
    {
        if ($deHoy === [] && $pendientes === 0) {
            return null;
        }

        $n = count($deHoy);
        $titulo = match (true) {
            $n === 0 => 'Hoy no tienes citas',
            $n === 1 => 'Hoy tienes 1 cita',
            default => "Hoy tienes {$n} citas",
        };
        $partes = array_map(
            fn(Cita $c) => Agenda::formatoHora($c->hora->format('H:i')) . ' ' . strtok($c->nombre, ' ')
                . ($c->estado === Cita::PENDIENTE ? ' (por confirmar)' : ''),
            $deHoy,
        );
        if ($pendientes > 0) {
            $partes[] = $pendientes === 1 ? '1 solicitud por confirmar' : "{$pendientes} solicitudes por confirmar";
        }

        return ['titulo' => $titulo, 'cuerpo' => implode(' · ', $partes)];
    }
}
