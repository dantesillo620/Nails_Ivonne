<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller;

use App\Controller\AuthController;
use App\Test\Fixture\UsuariosFixture;
use Cake\Cache\Cache;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class AuthControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = ['app.Usuarios', 'app.PushSuscripciones'];

    protected function setUp(): void
    {
        parent::setUp();
        Cache::clear('intentos');
    }

    /** @return array<string, mixed> */
    private function respuesta(): array
    {
        return json_decode((string)$this->_response->getBody(), true, flags: JSON_THROW_ON_ERROR);
    }

    private function entrar(string $password = UsuariosFixture::PASSWORD, string $email = UsuariosFixture::EMAIL): void
    {
        $this->enableCsrfToken();
        $this->post('/auth/login', ['email' => $email, 'password' => $password]);
    }

    public function testSesionSinEntrarDaElTokenCsrf(): void
    {
        $this->get('/auth/sesion');

        $this->assertResponseOk();
        $datos = $this->respuesta();
        $this->assertNull($datos['usuario']);
        $this->assertIsString($datos['csrfToken']);
        $this->assertNotEmpty($datos['csrfToken']);
    }

    public function testEntrarAbreLaSesion(): void
    {
        $this->entrar(password: UsuariosFixture::PASSWORD, email: ' IVONNE@ejemplo.com ');

        $this->assertResponseOk();
        $this->assertSame(['id' => 1, 'nombre' => 'Ivonne', 'email' => UsuariosFixture::EMAIL], $this->respuesta()['usuario']);
        $this->assertSession(1, 'Panel');
        $this->assertResponseNotContains('password');
    }

    public function testConLaSesionAbiertaSesionDevuelveElUsuario(): void
    {
        $this->session(['Panel' => 1]);
        $this->get('/auth/sesion');

        $this->assertSame('Ivonne', $this->respuesta()['usuario']['nombre']);
    }

    public function testContrasenaIncorrectaOCorreoDesconocido(): void
    {
        $this->entrar('otra-contrasena');
        $this->assertResponseCode(401);
        $this->assertSame('El correo o la contraseña no coinciden.', $this->respuesta()['message']);
        $this->assertSessionNotHasKey('Panel');

        $this->entrar(email: 'nadie@ejemplo.com');
        $this->assertResponseCode(401);
        $this->assertSame('El correo o la contraseña no coinciden.', $this->respuesta()['message']);
    }

    public function testDespuesDeVariosIntentosFallidosHayQueEsperar(): void
    {
        for ($i = 0; $i < AuthController::MAX_INTENTOS; $i++) {
            $this->entrar('mal-' . $i);
            $this->assertResponseCode(401);
        }

        // Ni con la contraseña correcta, hasta que pasen los 15 minutos.
        $this->entrar();
        $this->assertResponseCode(429);
        $this->assertStringContainsString('Espera 15 minutos', $this->respuesta()['message']);
    }

    public function testEntrarSinTokenCsrfSeRechaza(): void
    {
        $this->post('/auth/login', ['email' => UsuariosFixture::EMAIL, 'password' => UsuariosFixture::PASSWORD]);

        $this->assertResponseCode(403);
        $this->assertSessionNotHasKey('Panel');
    }

    public function testSalirCierraLaSesion(): void
    {
        $this->session(['Panel' => 1]);
        $this->enableCsrfToken();
        $this->post('/auth/logout');

        $this->assertResponseOk();
        $this->assertSessionNotHasKey('Panel');
    }

    public function testUnaCuentaBorradaPierdeElAcceso(): void
    {
        $this->getTableLocator()->get('Usuarios')->deleteAll([]);
        $this->session(['Panel' => 1]);
        $this->get('/admin/catalogo');

        $this->assertResponseCode(401);
    }
}
