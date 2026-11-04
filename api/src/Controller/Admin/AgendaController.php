<?php
declare(strict_types=1);

namespace App\Controller\Admin;

use App\Agenda\Agenda;
use App\Model\Entity\Bloqueo;
use App\Model\Entity\Cita;
use App\Model\Table\AjustesTable;
use App\Model\Table\BloqueosTable;
use App\Model\Table\CitasTable;
use Cake\Database\Exception\QueryException;
use Cake\Datasource\EntityInterface;
use DateInterval;
use DateTimeImmutable;

/**
 * Agenda en el panel: ver la semana, confirmar o cancelar citas, agregar citas que
 * llegaron por otro lado y bloquear días u horas.
 *
 * Los errores de datos responden 422 con {message, errores: {campo: mensaje}}.
 */
class AgendaController extends AppController
{
    protected CitasTable $Citas;
    protected BloqueosTable $Bloqueos;
    protected AjustesTable $Ajustes;

    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->Citas = $this->fetchTable('Citas');
        $this->Bloqueos = $this->fetchTable('Bloqueos');
        $this->Ajustes = $this->fetchTable('Ajustes');
    }

    /**
     * GET /admin/agenda?semana=AAAA-MM-DD: la semana (de lunes a domingo) que contiene esa
     * fecha; sin ella, la actual. Incluye las canceladas para que Ivonne vea el historial.
     *
     * @return void
     */
    public function index(): void
    {
        $agenda = Agenda::desdeAjustes($this->Ajustes);
        $pedida = (string)$this->request->getQuery('semana');
        $base = preg_match('/^\d{4}-\d{2}-\d{2}$/', $pedida) ? $pedida : $agenda->hoy();
        $dia = new DateTimeImmutable($base);
        $lunes = $dia->sub(new DateInterval('P' . ((int)$dia->format('N') - 1) . 'D'));
        $desde = $lunes->format('Y-m-d');
        $hasta = $lunes->add(new DateInterval('P6D'))->format('Y-m-d');

        $citas = $this->Citas->find('entre', desde: $desde, hasta: $hasta)
            ->contain(['Trabajos' => fn($q) => $q->orderBy(['Trabajos.orden' => 'ASC'])])
            ->all()
            ->map(fn(Cita $c) => $c->aPanel())
            ->toList();
        $bloqueos = $this->Bloqueos->find('entre', desde: $desde, hasta: $hasta)->all()
            ->map(fn(Bloqueo $b) => $this->bloqueo($b))
            ->toList();

        $this->json([
            'desde' => $desde,
            'hasta' => $hasta,
            'hoy' => $agenda->hoy(),
            'agenda' => $agenda->config(),
            'citas' => $citas,
            'bloqueos' => $bloqueos,
            // Pendientes de hoy en adelante, en cualquier semana: para el aviso del panel.
            'pendientes' => $this->Citas->find()
                ->where(['estado' => Cita::PENDIENTE, 'fecha >=' => $agenda->hoy()])
                ->count(),
        ]);
    }

    /**
     * PATCH /admin/citas/{id} con {estado}: confirmar, cancelar o regresar a pendiente.
     *
     * @param string $id Id de la cita.
     * @return void
     */
    public function estado(string $id): void
    {
        $this->request->allowMethod(['patch', 'put']);
        $cita = $this->Citas->get($id);
        $estado = (string)$this->request->getData('estado');
        if (!in_array($estado, Cita::ESTADOS, true)) {
            $this->fallo(['estado' => 'Estado no válido.']);

            return;
        }
        // 'estado' no se asigna en masa (la clienta no puede elegirlo): solo aquí.
        $cita->set('estado', $estado);
        if (!$this->guardar($cita)) {
            return;
        }

        $this->json(['cita' => $this->recargar($cita)->aPanel()]);
    }

    /**
     * POST /admin/citas con {nombre, telefono, fecha, hora, nota?}: una cita que llegó por
     * WhatsApp o en persona. Queda confirmada. Ivonne puede usar cualquier hora; lo único que se
     * cuida es no encimarla con otra cita.
     *
     * @return void
     */
    public function crear(): void
    {
        $this->request->allowMethod('post');
        $cita = $this->Citas->newEntity([
            'nombre' => $this->request->getData('nombre'),
            'telefono' => $this->request->getData('telefono'),
            'fecha' => $this->request->getData('fecha'),
            'hora' => $this->request->getData('hora'),
            'nota' => $this->request->getData('nota'),
        ]);
        $cita->set('estado', Cita::CONFIRMADA);
        if (!$this->guardar($cita)) {
            return;
        }

        $this->response = $this->response->withStatus(201);
        $this->json(['cita' => $this->recargar($cita)->aPanel()]);
    }

    /**
     * POST /admin/bloqueos con {fecha, hora?, motivo?}: sin hora se bloquea el día completo.
     * Las citas que ya estaban en ese horario no se tocan.
     *
     * @return void
     */
    public function bloquear(): void
    {
        $this->request->allowMethod('post');
        $hora = $this->request->getData('hora');
        $bloqueo = $this->Bloqueos->newEntity([
            'fecha' => $this->request->getData('fecha'),
            'hora' => $hora === '' ? null : $hora,
            'motivo' => $this->request->getData('motivo'),
        ]);
        if (!$this->Bloqueos->save($bloqueo)) {
            $this->fallo($this->errores($bloqueo));

            return;
        }

        $this->response = $this->response->withStatus(201);
        $this->json(['bloqueo' => $this->bloqueo($bloqueo)]);
    }

    /**
     * DELETE /admin/bloqueos/{id}
     *
     * @param string $id Id del bloqueo.
     * @return void
     */
    public function desbloquear(string $id): void
    {
        $this->request->allowMethod('delete');
        $this->Bloqueos->deleteOrFail($this->Bloqueos->get($id));
        $this->json(['ok' => true]);
    }

    /**
     * Guarda la cita; si choca con otra en el mismo horario responde 422.
     *
     * @param \App\Model\Entity\Cita $cita Cita.
     * @return bool
     */
    private function guardar(Cita $cita): bool
    {
        try {
            if ($this->Citas->save($cita)) {
                return true;
            }
        } catch (QueryException) {
            $cita->setError('hora', ['_isUnique' => 'Ese horario ya está apartado.']);
        }
        $this->fallo($this->errores($cita));

        return false;
    }

    /**
     * @param \App\Model\Entity\Bloqueo $b Bloqueo.
     * @return array{id: int, fecha: string, hora: string|null, motivo: string|null}
     */
    private function bloqueo(Bloqueo $b): array
    {
        return [
            'id' => $b->id,
            'fecha' => $b->fecha->format('Y-m-d'),
            'hora' => $b->hora?->format('H:i'),
            'motivo' => $b->motivo,
        ];
    }

    /**
     * @param \App\Model\Entity\Cita $cita Cita guardada.
     * @return \App\Model\Entity\Cita
     */
    private function recargar(Cita $cita): Cita
    {
        return $this->Citas->get($cita->id, contain: ['Trabajos']);
    }

    /**
     * @param \Cake\Datasource\EntityInterface $entidad Entidad validada.
     * @return array<string, string>
     */
    private function errores(EntityInterface $entidad): array
    {
        $errores = [];
        foreach ($entidad->getErrors() as $campo => $mensajes) {
            $errores[$campo] = (string)current((array)$mensajes);
        }

        return $errores;
    }

    /**
     * @param array<string, string> $errores Errores por campo.
     * @return void
     */
    private function fallo(array $errores): void
    {
        $this->response = $this->response->withStatus(422);
        $this->json(['message' => 'Revisa los datos marcados.', 'errores' => $errores]);
    }
}
