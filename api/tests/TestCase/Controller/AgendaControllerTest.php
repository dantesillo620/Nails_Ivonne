<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller;

use App\Controller\AgendaController;
use Cake\Cache\Cache;
use Cake\I18n\DateTime;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class AgendaControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = [
        'app.Categorias',
        'app.Trabajos',
        'app.Citas',
        'app.CitasTrabajos',
        'app.Bloqueos',
        'app.Ajustes',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        // Miércoles 4 de noviembre de 2026, 10:00 en Guadalajara.
        DateTime::setTestNow(new DateTime('2026-11-04 10:00:00', 'America/Mexico_City'));
        Cache::clear('citas');
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        DateTime::setTestNow(null);
    }

    /** @return array<string, mixed> */
    private function respuesta(): array
    {
        return json_decode((string)$this->_response->getBody(), true, flags: JSON_THROW_ON_ERROR);
    }

    /** @param array<string, mixed> $datos */
    private function pedir(array $datos = []): void
    {
        $this->post('/agenda/citas', $datos + [
            'nombre' => 'Carla',
            'telefono' => '33 1234 5678',
            'fecha' => '2026-11-05',
            'hora' => '16:00',
            'nota' => 'Primera vez',
            'disenos' => ['ni-02', 'NI-40', 'NI-99'],
        ]);
    }

    public function testDisponibilidadSoloDiceQueHorariosEstanOcupados(): void
    {
        $this->getTableLocator()->get('Bloqueos')->saveOrFail(
            $this->getTableLocator()->get('Bloqueos')->newEntity(['fecha' => '2026-11-06', 'hora' => '14:00']),
        );
        $this->getTableLocator()->get('Bloqueos')->saveOrFail(
            $this->getTableLocator()->get('Bloqueos')->newEntity(['fecha' => '2026-11-07']),
        );

        $this->get('/agenda/disponibilidad');

        $this->assertResponseOk();
        $this->assertHeader('Cache-Control', 'no-store');
        $d = $this->respuesta();
        $this->assertSame('2026-11-04', $d['hoy']);
        $this->assertSame('America/Mexico_City', $d['agenda']['zonaHoraria']);
        // La cita confirmada ocupa; la cancelada del mismo día no.
        $this->assertSame(['2026-11-06 14:00', '2026-11-10 16:00'], $d['ocupados']);
        $this->assertSame(['2026-11-07'], $d['diasBloqueados']);
        $this->assertResponseNotContains('Ana');
        $this->assertResponseNotContains('13855550101');
    }

    public function testApartarUnaCitaSinTokenCsrf(): void
    {
        $this->pedir();

        $this->assertResponseCode(201);
        $c = $this->respuesta()['cita'];
        $this->assertSame(['fecha' => '2026-11-05', 'hora' => '16:00', 'estado' => 'pendiente'], array_diff_key($c, ['id' => 0]));

        $guardada = $this->getTableLocator()->get('Citas')->get($c['id'], contain: ['Trabajos']);
        // 10 dígitos sin lada de país: se toman como de México.
        $this->assertSame('523312345678', $guardada->telefono);
        // Solo diseños visibles que existen.
        $this->assertSame(['NI-02'], array_column($guardada->trabajos, 'codigo'));
    }

    public function testUnNumeroConMasRespetaSuPais(): void
    {
        $this->pedir(['telefono' => '+1 (385) 555-0100']);

        $this->assertResponseCode(201);
        $this->assertSame('13855550100', $this->getTableLocator()->get('Citas')->get($this->respuesta()['cita']['id'])->telefono);
    }

    public function testUnHorarioOcupadoAvisaParaActualizar(): void
    {
        $this->pedir(['fecha' => '2026-11-10', 'hora' => '16:00']);

        $this->assertResponseCode(422);
        $d = $this->respuesta();
        $this->assertTrue($d['ocupado']);
        $this->assertSame('Ese horario se acaba de ocupar. Elige otro.', $d['message']);
    }

    public function testElHorarioDeUnaCitaCanceladaSePuedePedir(): void
    {
        $this->pedir(['fecha' => '2026-11-10', 'hora' => '18:00']);

        $this->assertResponseCode(201);
    }

    public function testSoloSePidenHorasDelHorario(): void
    {
        $casos = [
            ['2026-11-05', '15:00', 'no está en el horario'],
            ['2026-11-08', '14:00', 'no se atiende'],
            ['2026-11-03', '14:00', 'ya pasó'],
            ['2026-11-30', '14:00', 'todavía no está'],
        ];
        foreach ($casos as [$fecha, $hora, $mensaje]) {
            Cache::clear('citas');
            $this->pedir(['fecha' => $fecha, 'hora' => $hora]);
            $this->assertResponseCode(422, "{$fecha} {$hora}");
            $this->assertStringContainsString($mensaje, $this->respuesta()['errores']['hora']);
            $this->assertFalse($this->respuesta()['ocupado']);
        }
    }

    public function testHoySoloConLaAnticipacionMinima(): void
    {
        DateTime::setTestNow(new DateTime('2026-11-04 13:30:00', 'America/Mexico_City'));

        $this->pedir(['fecha' => '2026-11-04', 'hora' => '14:00']);
        $this->assertResponseCode(422);

        $this->pedir(['fecha' => '2026-11-04', 'hora' => '16:00']);
        $this->assertResponseCode(201);
    }

    public function testUnDiaBloqueadoNoSePuedePedir(): void
    {
        $bloqueos = $this->getTableLocator()->get('Bloqueos');
        $bloqueos->saveOrFail($bloqueos->newEntity(['fecha' => '2026-11-05', 'motivo' => 'Curso']));

        $this->pedir();

        $this->assertResponseCode(422);
        $this->assertTrue($this->respuesta()['ocupado']);
    }

    public function testFaltanNombreOTelefono(): void
    {
        $this->pedir(['nombre' => ' ', 'telefono' => '123']);

        $this->assertResponseCode(422);
        $errores = $this->respuesta()['errores'];
        $this->assertArrayHasKey('nombre', $errores);
        $this->assertArrayHasKey('telefono', $errores);
    }

    public function testElCampoTrampaDetieneABots(): void
    {
        $this->pedir(['sitio' => 'https://spam.example']);

        $this->assertResponseCode(400);
        $this->assertSame(2, $this->getTableLocator()->get('Citas')->find()->count());
    }

    public function testLimiteDeSolicitudesPorHora(): void
    {
        $horas = ['14:00', '16:00', '18:00', '20:00'];
        for ($i = 0; $i < AgendaController::MAX_POR_HORA; $i++) {
            $this->pedir(['fecha' => $i < 4 ? '2026-11-05' : '2026-11-06', 'hora' => $horas[$i % 4]]);
            $this->assertResponseCode(201);
        }

        $this->pedir(['fecha' => '2026-11-06', 'hora' => '16:00']);
        $this->assertResponseCode(429);
    }
}
