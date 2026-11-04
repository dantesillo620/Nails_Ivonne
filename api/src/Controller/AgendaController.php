<?php
declare(strict_types=1);

namespace App\Controller;

use App\Agenda\Agenda;
use App\Model\Entity\Cita;
use App\Model\Table\AjustesTable;
use App\Model\Table\BloqueosTable;
use App\Model\Table\CitasTable;
use App\Model\Table\TrabajosTable;
use Cake\Cache\Cache;
use Cake\Database\Exception\QueryException;
use Cake\Http\Exception\BadRequestException;
use Cake\Http\Exception\HttpException;

/**
 * Agenda pública: qué horarios están libres y apartar una cita.
 *
 * POST /agenda/citas no pide token CSRF (Application::middleware()): no hay sesión
 * que proteger y cualquiera puede pedir una cita. Para frenar abusos hay un límite
 * por IP y un campo trampa que las personas no ven.
 */
class AgendaController extends AppController
{
    /** Solicitudes de cita por IP cada hora. */
    public const MAX_POR_HORA = 5;
    /** Diseños que se pueden adjuntar a una cita. */
    public const MAX_DISENOS = 10;

    protected CitasTable $Citas;
    protected BloqueosTable $Bloqueos;
    protected AjustesTable $Ajustes;
    protected TrabajosTable $Trabajos;

    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->Citas = $this->fetchTable('Citas');
        $this->Bloqueos = $this->fetchTable('Bloqueos');
        $this->Ajustes = $this->fetchTable('Ajustes');
        $this->Trabajos = $this->fetchTable('Trabajos');
    }

    /**
     * GET /agenda/disponibilidad: ajustes de la agenda y los horarios que ya no se ofrecen.
     * Solo dice qué fecha y hora están ocupadas, nunca de quién.
     *
     * @return void
     */
    public function disponibilidad(): void
    {
        $agenda = Agenda::desdeAjustes($this->Ajustes);
        $ocupados = [];
        $diasBloqueados = [];

        $citas = $this->Citas->find('activasEntre', desde: $agenda->hoy(), hasta: $agenda->ultimoDia());
        foreach ($citas->all() as $cita) {
            /** @var \App\Model\Entity\Cita $cita */
            $ocupados[] = $cita->fecha->format('Y-m-d') . ' ' . $cita->hora->format('H:i');
        }
        $bloqueos = $this->Bloqueos->find('entre', desde: $agenda->hoy(), hasta: $agenda->ultimoDia());
        foreach ($bloqueos->all() as $bloqueo) {
            /** @var \App\Model\Entity\Bloqueo $bloqueo */
            if ($bloqueo->diaCompleto()) {
                $diasBloqueados[] = $bloqueo->fecha->format('Y-m-d');
            } else {
                $ocupados[] = $bloqueo->fecha->format('Y-m-d') . ' ' . $bloqueo->hora?->format('H:i');
            }
        }
        sort($ocupados);
        sort($diasBloqueados);

        $this->response = $this->response->withHeader('Cache-Control', 'no-store');
        $this->json([
            'agenda' => $agenda->config(),
            'hoy' => $agenda->hoy(),
            'ocupados' => array_values(array_unique($ocupados)),
            'diasBloqueados' => array_values(array_unique($diasBloqueados)),
        ]);
    }

    /**
     * POST /agenda/citas con {nombre, telefono, fecha, hora, nota?, disenos?: ['NI-25', ...]}.
     * La cita queda pendiente hasta que Ivonne la confirme.
     *
     * Responde 201 con {cita}, o 422 con {message, errores, ocupado?}: `ocupado` indica que
     * alguien más apartó ese horario y conviene volver a pedir la disponibilidad.
     *
     * @return void
     */
    public function crear(): void
    {
        $this->request->allowMethod('post');
        // Campo trampa: está oculto en el formulario, solo un bot lo llena.
        if ((string)$this->request->getData('sitio') !== '') {
            throw new BadRequestException('No se pudo enviar la solicitud.');
        }

        $clave = 'cita_' . sha1((string)$this->request->clientIp());
        if ((int)Cache::read($clave, 'citas') >= self::MAX_POR_HORA) {
            throw new HttpException(
                'Ya enviaste varias solicitudes. Si necesitas otra, escríbele a Ivonne por WhatsApp.',
                429,
            );
        }

        $fecha = (string)$this->request->getData('fecha');
        $hora = (string)$this->request->getData('hora');
        $agenda = Agenda::desdeAjustes($this->Ajustes);
        $motivo = $agenda->motivoNoDisponible($fecha, $hora);
        if ($motivo === null && $this->Bloqueos->bloquea($fecha, $hora)) {
            $motivo = 'Ese horario no está disponible. Elige otro.';
        }

        $cita = $this->Citas->newEntity([
            'nombre' => $this->request->getData('nombre'),
            'telefono' => $this->request->getData('telefono'),
            'fecha' => $fecha,
            'hora' => $hora,
            'nota' => $this->request->getData('nota'),
            'trabajos' => ['_ids' => $this->idsDeDisenos()],
        ]);
        $errores = $this->errores($cita);
        if ($motivo !== null) {
            $errores['hora'] = $motivo;
        }
        if ($errores) {
            $this->fallo($errores);

            return;
        }

        try {
            $guardada = $this->Citas->save($cita);
        } catch (QueryException) {
            // Dos personas apartaron el mismo horario al mismo tiempo: lo impidió el índice único.
            $guardada = false;
            $cita->setError('hora', ['_isUnique' => 'Ese horario ya está apartado.']);
        }
        if ($guardada === false) {
            $this->fallo($this->errores($cita));

            return;
        }

        Cache::write($clave, (int)Cache::read($clave, 'citas') + 1, 'citas');
        $this->response = $this->response->withStatus(201);
        $this->json(['cita' => $cita->aPublico()]);
    }

    /**
     * Ids de los diseños visibles que eligió la clienta (los demás se ignoran).
     *
     * @return list<int>
     */
    private function idsDeDisenos(): array
    {
        $codigos = $this->request->getData('disenos');
        if (!is_array($codigos) || $codigos === []) {
            return [];
        }
        $codigos = array_slice(array_unique(array_map(
            fn($c) => strtoupper((string)$c),
            array_filter($codigos, 'is_string'),
        )), 0, self::MAX_DISENOS);
        if ($codigos === []) {
            return [];
        }

        return array_map('intval', $this->Trabajos->find('publicos')
            ->select(['Trabajos.id'])
            ->where(['Trabajos.codigo IN' => $codigos])
            ->all()
            ->extract('id')
            ->toList());
    }

    /**
     * @param \App\Model\Entity\Cita $cita Cita validada.
     * @return array<string, string>
     */
    private function errores(Cita $cita): array
    {
        $errores = [];
        foreach ($cita->getErrors() as $campo => $mensajes) {
            if ($campo === 'trabajos') {
                continue;
            }
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
        $ocupado = isset($errores['hora']) && (
            str_contains($errores['hora'], 'apartado') || str_contains($errores['hora'], 'disponible')
        );
        $this->response = $this->response->withStatus(422);
        $this->json([
            'message' => $ocupado
                ? 'Ese horario se acaba de ocupar. Elige otro.'
                : 'Revisa los datos marcados.',
            'errores' => $errores,
            'ocupado' => $ocupado,
        ]);
    }
}
