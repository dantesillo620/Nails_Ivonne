<?php
declare(strict_types=1);

namespace App\Test\TestCase\Model\Table;

use Cake\TestSuite\TestCase;

/** Ajustes, bloqueos y usuarios: reglas pequeñas que conviene no romper. */
class OtrasTablasTest extends TestCase
{
    protected array $fixtures = ['app.Ajustes', 'app.Bloqueos', 'app.Usuarios', 'app.PushSuscripciones'];

    public function testAjustesSeLeenYGuardanComoArreglos(): void
    {
        /** @var \App\Model\Table\AjustesTable $ajustes */
        $ajustes = $this->getTableLocator()->get('Ajustes');

        $this->assertSame(['16:00', '18:00'], $ajustes->leer('agenda')['horas']);
        $this->assertSame(['x' => 1], $ajustes->leer('no-existe', ['x' => 1]));

        $ajustes->guardar('agenda', ['horas' => ['17:00']]);
        $ajustes->guardar('aviso', ['texto' => 'Vacaciones']);
        $this->assertSame(['horas' => ['17:00']], $ajustes->leer('agenda'));
        $this->assertSame(['texto' => 'Vacaciones'], $ajustes->leer('aviso'));
    }

    public function testNoSeRepiteUnBloqueoDeDiaCompleto(): void
    {
        /** @var \App\Model\Table\BloqueosTable $bloqueos */
        $bloqueos = $this->getTableLocator()->get('Bloqueos');

        $this->assertFalse($bloqueos->save($bloqueos->newEntity(['fecha' => '2026-12-24'])));
        $this->assertNotFalse($bloqueos->save($bloqueos->newEntity(['fecha' => '2026-12-24', 'hora' => '16:00'])));
    }

    public function testLaContrasenaSeGuardaComoHashYNoSaleEnJson(): void
    {
        /** @var \App\Model\Table\UsuariosTable $usuarios */
        $usuarios = $this->getTableLocator()->get('Usuarios');
        $usuario = $usuarios->saveOrFail($usuarios->newEntity([
            'email' => ' Ivonne@Ejemplo.com ',
            'nombre' => 'Ivonne',
            'password' => 'una-contrasena-larga',
        ]));

        $guardado = $usuarios->get($usuario->id);
        $this->assertSame('ivonne@ejemplo.com', $guardado->email);
        $this->assertTrue(password_verify('una-contrasena-larga', $guardado->password));
        $this->assertArrayNotHasKey('password', json_decode((string)json_encode($guardado), true));
    }

    public function testLaContrasenaCortaSeRechaza(): void
    {
        $usuarios = $this->getTableLocator()->get('Usuarios');
        $usuario = $usuarios->newEntity(['email' => 'a@b.com', 'nombre' => 'A', 'password' => 'corta']);

        $this->assertArrayHasKey('password', $usuario->getErrors());
    }
}
