<?php
declare(strict_types=1);

namespace App\Test\TestCase\Agenda;

use App\Agenda\Agenda;
use App\Test\Fixture\AjustesFixture;
use Cake\TestSuite\TestCase;
use DateTimeImmutable;
use DateTimeZone;

class AgendaTest extends TestCase
{
    private function agenda(string $ahoraEnGuadalajara): Agenda
    {
        $config = [
            'zonaHoraria' => 'America/Mexico_City',
            'horas' => [
                '1' => AjustesFixture::ENTRE_SEMANA,
                '3' => AjustesFixture::ENTRE_SEMANA,
                '5' => AjustesFixture::ENTRE_SEMANA,
                '6' => AjustesFixture::SABADO,
            ],
            'semanas' => 2,
            'anticipacionMinutos' => 60,
        ];

        return new Agenda($config, new DateTimeImmutable($ahoraEnGuadalajara, new DateTimeZone('America/Mexico_City')));
    }

    public function testHoyYUltimoDiaEnLaZonaDelEstudio(): void
    {
        // Miércoles 4 de noviembre: la semana termina el domingo 8, más dos semanas = domingo 22.
        $a = $this->agenda('2026-11-04 10:00');
        $this->assertSame('2026-11-04', $a->hoy());
        $this->assertSame('2026-11-22', $a->ultimoDia());

        // 5 de noviembre 03:00 UTC sigue siendo el 4 en Guadalajara.
        $utc = new Agenda(['zonaHoraria' => 'America/Mexico_City'], new DateTimeImmutable('2026-11-05 03:00', new DateTimeZone('UTC')));
        $this->assertSame('2026-11-04', $utc->hoy());
    }

    public function testHorasPorDiaDeLaSemana(): void
    {
        $a = $this->agenda('2026-11-04 10:00');
        $this->assertSame(AjustesFixture::SABADO, $a->horasDe('2026-11-07'));
        $this->assertSame(AjustesFixture::ENTRE_SEMANA, $a->horasDe('2026-11-09'));
        $this->assertSame([], $a->horasDe('2026-11-08'));
    }

    public function testMotivosParaNoOfrecerUnHorario(): void
    {
        $a = $this->agenda('2026-11-04 13:30');

        $this->assertNull($a->motivoNoDisponible('2026-11-04', '16:00'));
        $this->assertNull($a->motivoNoDisponible('2026-11-21', '09:00'), 'último sábado visible');
        $this->assertStringContainsString('ya no se alcanza', (string)$a->motivoNoDisponible('2026-11-04', '14:00'));
        $this->assertSame('Ese día ya pasó.', $a->motivoNoDisponible('2026-11-03', '16:00'));
        $this->assertSame('Ese día no se atiende.', $a->motivoNoDisponible('2026-11-08', '16:00'));
        $this->assertSame('Ese día no se atiende.', $a->motivoNoDisponible('2026-11-10', '16:00'));
        $this->assertStringContainsString('no está en el horario', (string)$a->motivoNoDisponible('2026-11-09', '15:00'));
        $this->assertNull($a->motivoNoDisponible('2026-11-07', '19:00'));
        $this->assertStringContainsString('todavía no está', (string)$a->motivoNoDisponible('2026-11-23', '14:00'));
        $this->assertStringContainsString('Elige un día', (string)$a->motivoNoDisponible('mañana', '4pm'));
    }
}
