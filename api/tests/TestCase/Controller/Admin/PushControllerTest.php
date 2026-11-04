<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Admin;

use Cake\Core\Configure;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class PushControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = ['app.Usuarios', 'app.PushSuscripciones', 'app.Ajustes'];

    private const SUSCRIPCION = [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/compu-nueva',
        'keys' => [
            'p256dh' => 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
            'auth' => 'tBHItJI5svbpez7KI4CCXg',
        ],
        'dispositivo' => 'Mac · Chrome',
    ];

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

    public function testSinSesionNoHayAvisos(): void
    {
        $this->get('/admin/push');

        $this->assertResponseCode(401);
    }

    public function testDaLaClavePublicaYLosDispositivos(): void
    {
        Configure::write('Push.publicKey', 'clave-publica');
        $this->conSesion();
        $this->get('/admin/push');

        $this->assertResponseOk();
        $d = $this->respuesta();
        $this->assertSame('clave-publica', $d['clavePublica']);
        $this->assertSame(['iPhone'], array_column($d['dispositivos'], 'dispositivo'));
        $this->assertResponseNotContains('tBHItJI5svbpez7KI4CCXg');
    }

    public function testSuscribirYVolverASuscribirNoDuplica(): void
    {
        $this->conSesion();
        $this->post('/admin/push/suscripciones', self::SUSCRIPCION);
        $this->assertResponseCode(201);
        $this->conSesion();
        $this->post('/admin/push/suscripciones', self::SUSCRIPCION);
        $this->assertResponseCode(201);

        $tabla = $this->getTableLocator()->get('PushSuscripciones');
        $this->assertSame(1, $tabla->find()->where(['endpoint' => self::SUSCRIPCION['endpoint']])->count());
        $this->assertSame(1, $tabla->find()->where(['endpoint' => self::SUSCRIPCION['endpoint']])->firstOrFail()->usuario_id);
    }

    public function testUnaSuscripcionInvalidaSeRechaza(): void
    {
        $this->conSesion();
        $this->post('/admin/push/suscripciones', ['endpoint' => 'http://inseguro', 'keys' => []]);

        $this->assertResponseCode(422);
    }

    public function testQuitarSoloElDispositivoIndicado(): void
    {
        $this->conSesion();
        $this->post('/admin/push/suscripciones/quitar', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/celular-de-ivonne']);

        $this->assertResponseOk();
        $this->assertSame(1, $this->respuesta()['borradas']);
        $this->assertSame(0, $this->getTableLocator()->get('PushSuscripciones')->find()->count());
    }

    public function testPruebaSinClavesAvisaQueFaltaConfigurar(): void
    {
        Configure::write('Push.publicKey', null);
        $this->conSesion();
        $this->post('/admin/push/prueba');

        $this->assertResponseCode(503);
    }

    public function testElegirLaAnticipacionDeLosRecordatorios(): void
    {
        $this->conSesion();
        $this->get('/admin/push');
        $this->assertSame(60, $this->respuesta()['recordatorioMinutos']);

        $this->conSesion();
        $this->patch('/admin/push/ajustes', ['recordatorioMinutos' => '120']);
        $this->assertResponseOk();
        $this->conSesion();
        $this->get('/admin/push');
        $this->assertSame(120, $this->respuesta()['recordatorioMinutos']);

        $this->conSesion();
        $this->patch('/admin/push/ajustes', ['recordatorioMinutos' => 45]);
        $this->assertResponseCode(422);
    }
}
