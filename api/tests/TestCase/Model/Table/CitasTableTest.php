<?php
declare(strict_types=1);

namespace App\Test\TestCase\Model\Table;

use App\Model\Entity\Cita;
use App\Model\Table\CitasTable;
use Cake\TestSuite\TestCase;

class CitasTableTest extends TestCase
{
    protected array $fixtures = ['app.Categorias', 'app.Trabajos', 'app.Citas', 'app.CitasTrabajos'];

    protected CitasTable $Citas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->Citas = $this->getTableLocator()->get('Citas');
    }

    /**
     * @param array<string, mixed> $datos
     */
    private function nueva(array $datos = []): Cita
    {
        return $this->Citas->newEntity($datos + [
            'nombre' => '  Carla ',
            'telefono' => '+1 (385) 555-0199',
            'fecha' => '2026-11-11',
            'hora' => '16:00',
        ]);
    }

    public function testUnaCitaNuevaQuedaPendienteYOcupaSuHorario(): void
    {
        $cita = $this->Citas->saveOrFail($this->nueva());

        $guardada = $this->Citas->get($cita->id);
        $this->assertSame(Cita::PENDIENTE, $guardada->estado);
        $this->assertTrue($guardada->ocupa);
        $this->assertSame('Carla', $guardada->nombre);
        $this->assertSame('13855550199', $guardada->telefono);
    }

    public function testNoSePuedenApartarDosCitasEnElMismoHorario(): void
    {
        $cita = $this->nueva(['fecha' => '2026-11-10', 'hora' => '16:00']);

        $this->assertFalse($this->Citas->save($cita));
        $this->assertArrayHasKey('hora', $cita->getErrors());
    }

    public function testUnHorarioConCitaCanceladaSigueDisponible(): void
    {
        $cita = $this->nueva(['fecha' => '2026-11-10', 'hora' => '18:00']);

        $this->assertNotFalse($this->Citas->save($cita));
    }

    public function testCancelarLiberaElHorario(): void
    {
        $confirmada = $this->Citas->get(1);
        $confirmada->set('estado', Cita::CANCELADA);
        $this->Citas->saveOrFail($confirmada);
        $this->assertNull($this->Citas->get(1)->ocupa);

        $this->assertNotFalse($this->Citas->save($this->nueva(['fecha' => '2026-11-10', 'hora' => '16:00'])));
    }

    public function testLaClientaNoPuedeElegirElEstado(): void
    {
        $cita = $this->Citas->saveOrFail($this->nueva(['estado' => Cita::CONFIRMADA]));

        $this->assertSame(Cita::PENDIENTE, $this->Citas->get($cita->id)->estado);
    }

    public function testGuardaLosDisenosElegidos(): void
    {
        $cita = $this->nueva(['trabajos' => ['_ids' => [1, 2]]]);
        $this->Citas->saveOrFail($cita);

        $conDisenos = $this->Citas->get($cita->id, contain: ['Trabajos']);
        $this->assertEqualsCanonicalizing(['NI-05', 'NI-02'], array_column($conDisenos->trabajos, 'codigo'));
    }

    public function testValidaTelefonoYNombre(): void
    {
        $cita = $this->nueva(['nombre' => '   ', 'telefono' => '123']);

        $this->assertArrayHasKey('nombre', $cita->getErrors());
        $this->assertArrayHasKey('telefono', $cita->getErrors());
    }
}
