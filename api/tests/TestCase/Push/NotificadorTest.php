<?php
declare(strict_types=1);

namespace App\Test\TestCase\Push;

use App\Agenda\Agenda;
use App\Command\AgendaCommand;
use App\Push\Notificador;
use Cake\TestSuite\TestCase;
use Generator;
use Laminas\Diactoros\Request;
use Laminas\Diactoros\Response;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use RuntimeException;

class NotificadorTest extends TestCase
{
    protected array $fixtures = ['app.Usuarios', 'app.PushSuscripciones'];

    /**
     * WebPush simulado: recuerda lo que se encola y responde con los códigos dados por endpoint.
     *
     * @param array<string, int> $codigos endpoint => código HTTP del servicio de push
     */
    private function webPush(array $codigos, array &$enviados): WebPush
    {
        $mock = $this->createStub(WebPush::class);
        $mock->method('queueNotification')->willReturnCallback(
            function ($sub, $payload) use (&$enviados): void {
                $enviados[] = ['endpoint' => $sub->getEndpoint(), 'payload' => json_decode((string)$payload, true)];
            },
        );
        $mock->method('flush')->willReturnCallback(function () use ($codigos, &$enviados): Generator {
            foreach ($enviados as $e) {
                $codigo = $codigos[$e['endpoint']] ?? 201;
                $req = new Request($e['endpoint'], 'POST');
                yield new MessageSentReport($req, new Response('php://memory', $codigo), $codigo < 300, "HTTP {$codigo}");
            }
        });

        return $mock;
    }

    public function testElAvisoUsaElFormatoDelServiceWorkerDeAngular(): void
    {
        $n = Notificador::notificacion('Nueva cita', 'Carla · jueves', '/admin', 'cita-4');

        $this->assertSame('Nueva cita', $n['notification']['title']);
        $this->assertSame('/brand/app/insignia-96.png', $n['notification']['badge']);
        $this->assertSame(
            ['operation' => 'navigateLastFocusedOrOpen', 'url' => '/admin'],
            $n['notification']['data']['onActionClick']['default'],
        );
    }

    public function testMandaATodosYBorraLosDispositivosPerdidos(): void
    {
        $tabla = $this->getTableLocator()->get('PushSuscripciones');
        $tabla->saveOrFail($tabla->newEntity([
            'endpoint' => 'https://web.push.apple.com/viejo',
            'p256dh' => 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
            'auth' => 'tBHItJI5svbpez7KI4CCXg',
        ] + ['usuario_id' => 1], ['accessibleFields' => ['usuario_id' => true]]));

        $enviados = [];
        $wp = $this->webPush(['https://web.push.apple.com/viejo' => 410], $enviados);
        $r = (new Notificador($tabla, $wp))->aTodos(Notificador::notificacion('Hola', 'Prueba', '/admin', 'x'));

        $this->assertSame(['enviadas' => 1, 'fallidas' => 1, 'borradas' => 1], $r);
        $this->assertSame('Hola', $enviados[0]['payload']['notification']['title']);
        $this->assertFalse($tabla->exists(['endpoint' => 'https://web.push.apple.com/viejo']));
        $this->assertTrue($tabla->exists(['id' => 1]));
    }

    public function testSinClavesNoMandaNiFalla(): void
    {
        $tabla = $this->getTableLocator()->get('PushSuscripciones');
        $n = new Notificador($tabla, null);

        $this->assertFalse($n->configurado());
        $this->assertSame(['enviadas' => 0, 'fallidas' => 0, 'borradas' => 0], $n->aTodos(['notification' => []]));
    }

    public function testUnErrorAlEnviarNoSePropaga(): void
    {
        $mock = $this->createStub(WebPush::class);
        $mock->method('flush')->willThrowException(new RuntimeException('sin red'));
        $r = (new Notificador($this->getTableLocator()->get('PushSuscripciones'), $mock))
            ->aUsuario(1, ['notification' => ['title' => 'x']]);

        $this->assertSame(1, $r['fallidas']);
    }

    public function testFechasEnEspanolComoEnElSitio(): void
    {
        $this->assertSame('jueves 5 de noviembre', Agenda::formatoDia('2026-11-05'));
        $this->assertSame('4:00 p. m.', Agenda::formatoHora('16:00'));
        $this->assertSame('9:30 a. m.', Agenda::formatoHora('09:30'));
        $this->assertSame('12:00 p. m.', Agenda::formatoHora('12:00'));
    }

    public function testResumenDelDia(): void
    {
        $citas = $this->getTableLocator()->get('Citas');
        $ana = $citas->newEntity(['nombre' => 'Ana López', 'telefono' => '3311112222', 'fecha' => '2026-11-05', 'hora' => '14:00']);
        $ana->set('estado', 'confirmada');
        $bety = $citas->newEntity(['nombre' => 'Bety', 'telefono' => '3311113333', 'fecha' => '2026-11-05', 'hora' => '18:00']);
        $bety->set('estado', 'pendiente');

        $this->assertNull(AgendaCommand::resumen([], 0));
        $this->assertSame(
            ['titulo' => 'Hoy tienes 2 citas', 'cuerpo' => '2:00 p. m. Ana · 6:00 p. m. Bety (por confirmar) · 3 solicitudes por confirmar'],
            AgendaCommand::resumen([$ana, $bety], 3),
        );
        $this->assertSame(
            ['titulo' => 'Hoy no tienes citas', 'cuerpo' => '1 solicitud por confirmar'],
            AgendaCommand::resumen([], 1),
        );
    }
}
