<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Admin;

use Cake\I18n\DateTime;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class AgendaControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = [
        'app.Usuarios',
        'app.PushSuscripciones',
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
        DateTime::setTestNow(new DateTime('2026-11-04 10:00:00', 'America/Mexico_City'));
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

    private function conSesion(): void
    {
        $this->session(['Panel' => 1]);
        $this->enableCsrfToken();
    }

    public function testSinSesionNoSeVeLaAgenda(): void
    {
        $this->get('/admin/agenda');

        $this->assertResponseCode(401);
    }

    public function testLaSemanaConSusCitasYBloqueos(): void
    {
        $this->conSesion();
        $this->get('/admin/agenda?semana=2026-11-12');

        $this->assertResponseOk();
        $d = $this->respuesta();
        $this->assertSame(['2026-11-09', '2026-11-15'], [$d['desde'], $d['hasta']]);
        $this->assertSame('2026-11-04', $d['hoy']);
        // También las canceladas, en orden de hora.
        $this->assertSame(['confirmada', 'cancelada'], array_column($d['citas'], 'estado'));
        $this->assertSame('Ana', $d['citas'][0]['nombre']);
        $this->assertSame('13855550101', $d['citas'][0]['telefono']);
        $this->assertSame(0, $d['pendientes']);
    }

    public function testSinSemanaEsLaActual(): void
    {
        $this->conSesion();
        $this->get('/admin/agenda');

        $this->assertSame(['2026-11-02', '2026-11-08'], [$this->respuesta()['desde'], $this->respuesta()['hasta']]);
        $this->assertSame([], $this->respuesta()['citas']);
    }

    public function testConfirmarYCancelar(): void
    {
        $this->conSesion();
        $this->patch('/admin/citas/1', ['estado' => 'cancelada']);
        $this->assertResponseOk();
        $this->assertSame('cancelada', $this->respuesta()['cita']['estado']);

        // La cancelada de las 18:00 se puede volver a activar: su horario está libre.
        $this->conSesion();
        $this->patch('/admin/citas/2', ['estado' => 'confirmada']);
        $this->assertResponseOk();
    }

    public function testNoSeReactivaUnaCitaSiSuHorarioYaSeOcupo(): void
    {
        $citas = $this->getTableLocator()->get('Citas');
        $citas->saveOrFail($citas->newEntity([
            'nombre' => 'Dalia',
            'telefono' => '3312345678',
            'fecha' => '2026-11-10',
            'hora' => '18:00',
        ]));

        $this->conSesion();
        $this->patch('/admin/citas/2', ['estado' => 'pendiente']);

        $this->assertResponseCode(422);
        $this->assertSame('Ese horario ya está apartado.', $this->respuesta()['errores']['hora']);
    }

    public function testEstadoInvalido(): void
    {
        $this->conSesion();
        $this->patch('/admin/citas/1', ['estado' => 'borrada']);

        $this->assertResponseCode(422);
    }

    public function testAgregarUnaCitaDeWhatsAppAUnaHoraCualquiera(): void
    {
        $this->conSesion();
        $this->post('/admin/citas', [
            'nombre' => 'Elena',
            'telefono' => '33 9876 5432',
            'fecha' => '2026-11-05',
            'hora' => '15:30',
            'nota' => 'Me escribió por WhatsApp',
        ]);

        $this->assertResponseCode(201);
        $c = $this->respuesta()['cita'];
        $this->assertSame('confirmada', $c['estado']);
        $this->assertSame('15:30', $c['hora']);
        $this->assertSame('523398765432', $c['telefono']);
    }

    public function testBloquearYDesbloquear(): void
    {
        $this->conSesion();
        $this->post('/admin/bloqueos', ['fecha' => '2026-11-06', 'hora' => '', 'motivo' => 'Curso']);
        $this->assertResponseCode(201);
        $b = $this->respuesta()['bloqueo'];
        $this->assertNull($b['hora']);

        $this->get('/agenda/disponibilidad');
        $this->assertContains('2026-11-06', $this->respuesta()['diasBloqueados']);

        $this->conSesion();
        $this->delete("/admin/bloqueos/{$b['id']}");
        $this->assertResponseOk();
        $this->get('/agenda/disponibilidad');
        $this->assertNotContains('2026-11-06', $this->respuesta()['diasBloqueados']);
    }

    public function testNoSeRepiteUnBloqueo(): void
    {
        $this->conSesion();
        $this->post('/admin/bloqueos', ['fecha' => '2026-11-06', 'hora' => '16:00']);
        $this->conSesion();
        $this->post('/admin/bloqueos', ['fecha' => '2026-11-06', 'hora' => '16:00']);

        $this->assertResponseCode(422);
    }
}
