<?php
declare(strict_types=1);

namespace App\Test\TestCase\Command;

use App\Command\AgendaCommand;
use App\Model\Entity\Cita;
use Cake\Console\TestSuite\ConsoleIntegrationTestTrait;
use Cake\Core\Configure;
use Cake\I18n\DateTime;
use Cake\TestSuite\TestCase;
use DateTimeImmutable;
use DateTimeZone;

class AgendaCommandTest extends TestCase
{
    use ConsoleIntegrationTestTrait;

    protected array $fixtures = [
        'app.Categorias',
        'app.Trabajos',
        'app.Citas',
        'app.CitasTrabajos',
        'app.Ajustes',
        'app.Usuarios',
        'app.PushSuscripciones',
    ];

    private DateTimeZone $gdl;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gdl = new DateTimeZone('America/Mexico_City');
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        DateTime::setTestNow(null);
    }

    /** @param array<string, mixed> $datos */
    private function cita(array $datos): Cita
    {
        $citas = $this->getTableLocator()->get('Citas');
        $cita = $citas->newEntity($datos + ['nombre' => 'Ana', 'telefono' => '3311112222']);
        $cita->set('estado', $datos['estado'] ?? 'confirmada');

        return $citas->saveOrFail($cita);
    }

    public function testSoloLasQueEmpiezanDentroDeLaAnticipacion(): void
    {
        $a = $this->cita(['fecha' => '2026-11-05', 'hora' => '16:00']);
        $b = $this->cita(['fecha' => '2026-11-05', 'hora' => '18:00']);
        $c = $this->cita(['fecha' => '2026-11-05', 'hora' => '14:00']);
        $ahora = new DateTimeImmutable('2026-11-05 15:05', $this->gdl);

        $lista = AgendaCommand::porRecordar([$a, $b, $c], $ahora, 60, $this->gdl);

        // La de las 4 (faltan 55 min) sí; la de las 6 todavía no; la de las 2 ya empezó.
        $this->assertSame([[$a->id, 55]], array_map(fn($x) => [$x[0]->id, $x[1]], $lista));
    }

    public function testTextoDelRecordatorio(): void
    {
        $cita = $this->cita(['fecha' => '2026-11-05', 'hora' => '16:00', 'estado' => 'pendiente', 'trabajos' => ['_ids' => [2]]]);
        $cita = $this->getTableLocator()->get('Citas')->get($cita->id, contain: ['Trabajos']);

        $this->assertSame(
            ['titulo' => 'En 55 min: Ana', 'cuerpo' => '4:00 p. m. · NI-02 · aún por confirmar'],
            AgendaCommand::recordatorio($cita, 53),
        );
        $this->assertSame('En 1 h: Ana', AgendaCommand::recordatorio($cita, 58)['titulo']);
        $this->assertSame('En 1 h 30 min: Ana', AgendaCommand::recordatorio($cita, 91)['titulo']);
    }

    public function testAnticipacionGuardadaODefault(): void
    {
        $this->assertSame(60, AgendaCommand::anticipacion([]));
        $this->assertSame(120, AgendaCommand::anticipacion(['recordatorioMinutos' => 120]));
        $this->assertSame(0, AgendaCommand::anticipacion(['recordatorioMinutos' => 0]));
        $this->assertSame(60, AgendaCommand::anticipacion(['recordatorioMinutos' => 7]));
    }

    public function testElComandoMarcaLaCitaParaNoRepetir(): void
    {
        // Claves de mentira: el envío fallará (sin red real en pruebas), pero la cita se marca igual.
        Configure::write('Push.publicKey', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');
        Configure::write('Push.privateKey', 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls');
        $this->getTableLocator()->get('PushSuscripciones')->deleteAll([]);
        $cita = $this->cita(['fecha' => '2026-11-05', 'hora' => '16:00']);
        DateTime::setTestNow(new DateTime('2026-11-05 15:10:00', 'America/Mexico_City'));

        $this->exec('agenda recordatorios');
        $this->assertExitSuccess();
        $this->assertOutputContains('En 50 min: Ana');
        $this->assertNotNull($this->getTableLocator()->get('Citas')->get($cita->id)->recordada);

        $this->exec('agenda recordatorios');
        $this->assertOutputContains('No hay citas por recordar.');
    }

    public function testApagados(): void
    {
        $this->getTableLocator()->get('Ajustes')->guardar('avisos', ['recordatorioMinutos' => 0]);

        $this->exec('agenda recordatorios');

        $this->assertExitSuccess();
        $this->assertOutputContains('apagados');
    }
}
