<?php
declare(strict_types=1);

namespace App\Agenda;

use App\Model\Table\AjustesTable;
use Cake\I18n\DateTime;
use DateInterval;
use DateTimeImmutable;
use DateTimeZone;

/**
 * Reglas de la agenda con la hora del estudio (ajustes.agenda), las mismas que
 * generarSemanas() en src/app/core/agenda.ts:
 *
 * - Solo se ofrecen las horas del horario de cada día de la semana.
 * - Hoy, solo las horas que faltan con la anticipación mínima.
 * - Hasta `semanas` semanas después de la actual.
 *
 * Que el horario esté libre (citas y bloqueos) lo revisa quien usa esta clase.
 */
class Agenda
{
    /** Ajustes si no hay nada guardado (los mismos de SITE.agenda en el front). */
    public const PREDETERMINADA = [
        'zonaHoraria' => 'America/Mexico_City',
        'horas' => [],
        'semanas' => 2,
        'anticipacionMinutos' => 60,
    ];

    private DateTimeZone $zona;
    private DateTimeImmutable $ahora;

    /**
     * @param array<string, mixed> $config Ajustes de la agenda.
     * @param \DateTimeImmutable|null $ahora Momento actual (para pruebas); por defecto, ahora.
     */
    public function __construct(private array $config, ?DateTimeImmutable $ahora = null)
    {
        $this->config += self::PREDETERMINADA;
        $this->zona = new DateTimeZone((string)$this->config['zonaHoraria']);
        // DateTime::now() respeta DateTime::setTestNow() en las pruebas.
        $this->ahora = ($ahora ?? DateTime::now())->setTimezone($this->zona);
    }

    /**
     * @param \App\Model\Table\AjustesTable $ajustes Tabla de ajustes.
     * @return self
     */
    public static function desdeAjustes(AjustesTable $ajustes): self
    {
        return new self($ajustes->leer('agenda', self::PREDETERMINADA));
    }

    /**
     * Ajustes que necesita el sitio para dibujar la agenda.
     *
     * @return array<string, mixed>
     */
    public function config(): array
    {
        return [
            'zonaHoraria' => $this->config['zonaHoraria'],
            'horas' => (object)$this->config['horas'],
            'semanas' => (int)$this->config['semanas'],
            'anticipacionMinutos' => (int)$this->config['anticipacionMinutos'],
        ];
    }

    /**
     * Hoy en el estudio ('AAAA-MM-DD').
     *
     * @return string
     */
    public function hoy(): string
    {
        return $this->ahora->format('Y-m-d');
    }

    /**
     * Último día que se puede pedir: el domingo de la última semana visible.
     * Se cuenta una semana de más porque, si la actual ya terminó, el sitio empieza en la siguiente.
     *
     * @return string
     */
    public function ultimoDia(): string
    {
        $diaSemana = (int)$this->ahora->format('N'); // 1 lunes … 7 domingo
        $domingo = $this->ahora->add(new DateInterval('P' . (7 - $diaSemana) . 'D'));

        return $domingo->add(new DateInterval('P' . (7 * (int)$this->config['semanas']) . 'D'))->format('Y-m-d');
    }

    /**
     * Horas del horario de ese día de la semana.
     *
     * @param string $fecha 'AAAA-MM-DD'.
     * @return list<string>
     */
    public function horasDe(string $fecha): array
    {
        $dia = (int)(new DateTimeImmutable($fecha, $this->zona))->format('w'); // 0 domingo … 6 sábado

        $horas = (array)$this->config['horas'];

        return array_values(array_map('strval', (array)($horas[$dia] ?? $horas[(string)$dia] ?? [])));
    }

    /**
     * Por qué no se puede pedir ese horario, o null si se puede (sin contar si está ocupado).
     * Los mensajes son para la clienta.
     *
     * @param string $fecha 'AAAA-MM-DD'.
     * @param string $hora 'HH:MM'.
     * @return string|null
     */
    public function motivoNoDisponible(string $fecha, string $hora): ?string
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || !preg_match('/^\d{2}:\d{2}$/', $hora)) {
            return 'Elige un día y una hora de la agenda.';
        }
        if ($fecha < $this->hoy()) {
            return 'Ese día ya pasó.';
        }
        if ($fecha > $this->ultimoDia()) {
            return 'Ese día todavía no está en la agenda.';
        }
        $horas = $this->horasDe($fecha);
        if ($horas === []) {
            return 'Ese día no se atiende.';
        }
        if (!in_array($hora, $horas, true)) {
            return 'Esa hora no está en el horario de ese día.';
        }
        if ($fecha === $this->hoy()) {
            $faltan = self::minutos($hora) - self::minutos($this->ahora->format('H:i'));
            if ($faltan < (int)$this->config['anticipacionMinutos']) {
                return 'Esa hora ya no se alcanza a pedir hoy. Elige otra.';
            }
        }

        return null;
    }

    /**
     * @param string $hora 'HH:MM'.
     * @return int
     */
    private static function minutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', $hora));

        return $h * 60 + $m;
    }
}
