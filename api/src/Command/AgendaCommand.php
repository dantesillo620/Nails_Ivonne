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
use Cake\I18n\DateTime;
use DateTimeImmutable;
use DateTimeZone;

/**
 * Avisos de la agenda para Ivonne, como notificaciones.
 *
 *   bin/cake agenda resumen         resumen del día (cron cada mañana)
 *   bin/cake agenda recordatorios   aviso antes de cada cita (cron cada 10 minutos)
 *
 * Usan la hora de Guadalajara, sin importar la zona horaria del servidor (ver api/README.md).
 */
class AgendaCommand extends Command
{
    /**
     * @inheritDoc
     */
    public const RECORDATORIO_PREDETERMINADO = 60;
    /** Anticipaciones que Ivonne puede elegir en el panel (0: sin recordatorios). */
    public const ANTICIPACIONES = [0, 30, 60, 120, 180];

    /**
     * @inheritDoc
     */
    public static function getDescription(): string
    {
        return 'Avisos de la agenda para Ivonne: resumen del día y recordatorios de cada cita.';
    }

    /**
     * @inheritDoc
     */
    protected function buildOptionParser(ConsoleOptionParser $parser): ConsoleOptionParser
    {
        return $parser
            ->setDescription(static::getDescription())
            ->addArgument('accion', [
                'help' => 'resumen o recordatorios',
                'required' => true,
                'choices' => ['resumen', 'recordatorios'],
            ]);
    }

    /**
     * @inheritDoc
     */
    public function execute(Arguments $args, ConsoleIo $io): int
    {
        return $args->getArgument('accion') === 'recordatorios'
            ? $this->recordatorios($io)
            : $this->resumenDelDia($io);
    }

    /**
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @return int
     */
    private function resumenDelDia(ConsoleIo $io): int
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
     * Avisa de las citas que empiezan dentro de la anticipación elegida (ajustes.avisos), una vez
     * por cita. Con cron cada 10 minutos, el aviso llega entre la anticipación y 10 minutos menos.
     *
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @return int
     */
    private function recordatorios(ConsoleIo $io): int
    {
        /** @var \App\Model\Table\AjustesTable $ajustes */
        $ajustes = $this->fetchTable('Ajustes');
        /** @var \App\Model\Table\CitasTable $citas */
        $citas = $this->fetchTable('Citas');
        /** @var \App\Model\Table\PushSuscripcionesTable $suscripciones */
        $suscripciones = $this->fetchTable('PushSuscripciones');

        $minutos = self::anticipacion($ajustes->leer('avisos'));
        if ($minutos === 0) {
            $io->out('Los recordatorios están apagados en el panel.');

            return static::CODE_SUCCESS;
        }
        $notificador = Notificador::desdeConfig($suscripciones);
        if (!$notificador->configurado()) {
            $io->error('Faltan las claves de push (bin/cake push claves).');

            return static::CODE_ERROR;
        }

        $config = $ajustes->leer('agenda', Agenda::PREDETERMINADA);
        $zona = new DateTimeZone((string)($config['zonaHoraria'] ?? Agenda::PREDETERMINADA['zonaHoraria']));
        $ahora = DateTime::now()->setTimezone($zona);
        $hasta = $ahora->modify("+{$minutos} minutes")->format('Y-m-d');
        $candidatas = $citas->find('activasEntre', desde: $ahora->format('Y-m-d'), hasta: $hasta)
            ->contain(['Trabajos'])
            ->where(['Citas.recordada IS' => null])
            ->all()
            ->toList();

        $enviados = 0;
        foreach (self::porRecordar($candidatas, $ahora, $minutos, $zona) as [$cita, $faltan]) {
            $aviso = self::recordatorio($cita, $faltan);
            $notificador->aTodos(Notificador::notificacion(
                $aviso['titulo'],
                $aviso['cuerpo'],
                '/admin?semana=' . $cita->fecha->format('Y-m-d'),
                'recordatorio-' . $cita->id,
            ));
            $cita->set('recordada', DateTime::now());
            $citas->saveOrFail($cita, ['checkRules' => false]);
            $io->out("{$aviso['titulo']} — {$aviso['cuerpo']}");
            $enviados++;
        }
        $io->out($enviados ? "Recordatorios enviados: {$enviados}" : 'No hay citas por recordar.');

        return static::CODE_SUCCESS;
    }

    /**
     * Minutos de anticipación guardados en el panel (ajustes.avisos.recordatorioMinutos).
     *
     * @param array<string, mixed> $avisos Ajuste 'avisos'.
     * @return int
     */
    public static function anticipacion(array $avisos): int
    {
        $minutos = (int)($avisos['recordatorioMinutos'] ?? self::RECORDATORIO_PREDETERMINADO);

        return in_array($minutos, self::ANTICIPACIONES, true) ? $minutos : self::RECORDATORIO_PREDETERMINADO;
    }

    /**
     * Las citas que empiezan después de ahora y a más tardar en $minutos, con los minutos que faltan.
     * Las que ya empezaron no se recuerdan (llegaría tarde).
     *
     * @param list<\App\Model\Entity\Cita> $citas Citas activas sin recordar.
     * @param \DateTimeImmutable $ahora Ahora, en la zona del estudio.
     * @param int $minutos Anticipación.
     * @param \DateTimeZone $zona Zona del estudio.
     * @return list<array{0: \App\Model\Entity\Cita, 1: int}>
     */
    public static function porRecordar(array $citas, DateTimeImmutable $ahora, int $minutos, DateTimeZone $zona): array
    {
        $lista = [];
        foreach ($citas as $cita) {
            $inicio = new DateTimeImmutable($cita->fecha->format('Y-m-d') . ' ' . $cita->hora->format('H:i'), $zona);
            $faltan = (int)floor(($inicio->getTimestamp() - $ahora->getTimestamp()) / 60);
            if ($faltan > 0 && $faltan <= $minutos) {
                $lista[] = [$cita, $faltan];
            }
        }

        return $lista;
    }

    /**
     * Texto del aviso: 'En 1 h: Ana' / '4:00 p. m. · NI-25 · aún por confirmar'.
     *
     * @param \App\Model\Entity\Cita $cita Cita con sus diseños.
     * @param int $faltan Minutos que faltan.
     * @return array{titulo: string, cuerpo: string}
     */
    public static function recordatorio(Cita $cita, int $faltan): array
    {
        // Se redondea a 5 minutos: el cron no corre al minuto exacto.
        $redondeo = max(5, (int)(round($faltan / 5) * 5));
        $h = intdiv($redondeo, 60);
        $m = $redondeo % 60;
        $cuando = $h === 0 ? "{$m} min" : ($m === 0 ? "{$h} h" : "{$h} h {$m} min");

        $partes = [Agenda::formatoHora($cita->hora->format('H:i'))];
        $codigos = array_map(fn($t) => $t->codigo, $cita->trabajos ?? []);
        if ($codigos) {
            $partes[] = implode(', ', $codigos);
        }
        if ($cita->estado === Cita::PENDIENTE) {
            $partes[] = 'aún por confirmar';
        }

        return ['titulo' => "En {$cuando}: {$cita->nombre}", 'cuerpo' => implode(' · ', $partes)];
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
