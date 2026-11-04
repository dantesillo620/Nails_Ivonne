<?php
declare(strict_types=1);

namespace App\Controller\Admin;

use App\Model\Entity\PushSuscripcion;
use App\Model\Entity\Usuario;
use App\Model\Table\PushSuscripcionesTable;
use App\Push\Notificador;
use Cake\Core\Configure;
use Cake\Http\Exception\UnauthorizedException;

/**
 * Avisos del panel en cada dispositivo de Ivonne.
 *
 * El navegador entrega una suscripción (endpoint y claves) cuando Ivonne acepta los avisos;
 * aquí se guarda a nombre de su cuenta. Un mismo endpoint se reemplaza en vez de repetirse.
 */
class PushController extends AppController
{
    protected PushSuscripcionesTable $Suscripciones;

    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->Suscripciones = $this->fetchTable('PushSuscripciones');
    }

    /**
     * GET /admin/push: la clave pública (null si el servidor no tiene claves) y los
     * dispositivos de esta cuenta con avisos activos.
     *
     * @return void
     */
    public function index(): void
    {
        $this->json([
            'clavePublica' => Configure::read('Push.publicKey') ?: null,
            'dispositivos' => $this->Suscripciones->find()
                ->where(['usuario_id' => $this->usuario()->id])
                ->orderBy(['created' => 'DESC'])
                ->all()
                ->map(fn(PushSuscripcion $s) => [
                    'id' => $s->id,
                    'endpoint' => $s->endpoint,
                    'dispositivo' => $s->dispositivo,
                    'creado' => $s->created?->toIso8601String(),
                ])
                ->toList(),
        ]);
    }

    /**
     * POST /admin/push/suscripciones con {endpoint, keys: {p256dh, auth}, dispositivo?}.
     *
     * @return void
     */
    public function suscribir(): void
    {
        $this->request->allowMethod('post');
        $endpoint = (string)$this->request->getData('endpoint');
        $suscripcion = $this->Suscripciones->find()->where(['endpoint' => $endpoint])->first()
            ?? $this->Suscripciones->newEmptyEntity();
        $this->Suscripciones->patchEntity($suscripcion, [
            'endpoint' => $endpoint,
            'p256dh' => $this->request->getData('keys.p256dh'),
            'auth' => $this->request->getData('keys.auth'),
            'dispositivo' => mb_substr((string)$this->request->getData('dispositivo'), 0, 255) ?: null,
        ]);
        // El mismo navegador pudo estar con otra cuenta: queda a nombre de quien activa ahora.
        $suscripcion->set('usuario_id', $this->usuario()->id);

        if (!$this->Suscripciones->save($suscripcion)) {
            $this->response = $this->response->withStatus(422);
            $this->json([
                'message' => 'El navegador no entregó una suscripción válida. Intenta de nuevo.',
                'errores' => array_map(fn($m) => (string)current((array)$m), $suscripcion->getErrors()),
            ]);

            return;
        }

        $this->response = $this->response->withStatus(201);
        $this->json(['ok' => true, 'id' => $suscripcion->id]);
    }

    /**
     * POST /admin/push/suscripciones/quitar con {endpoint}: este dispositivo deja de recibir avisos.
     *
     * @return void
     */
    public function quitar(): void
    {
        $this->request->allowMethod('post');
        $borradas = $this->Suscripciones->deleteAll([
            'endpoint' => (string)$this->request->getData('endpoint'),
            'usuario_id' => $this->usuario()->id,
        ]);
        $this->json(['ok' => true, 'borradas' => $borradas]);
    }

    /**
     * POST /admin/push/prueba: un aviso de prueba a los dispositivos de esta cuenta.
     *
     * @return void
     */
    public function prueba(): void
    {
        $this->request->allowMethod('post');
        $notificador = Notificador::desdeConfig($this->Suscripciones);
        if (!$notificador->configurado()) {
            $this->response = $this->response->withStatus(503);
            $this->json(['message' => 'El servidor todavía no tiene configurados los avisos.']);

            return;
        }

        $this->json($notificador->aUsuario($this->usuario()->id, Notificador::notificacion(
            'Así se ven tus avisos',
            'Te llegará uno como este cada vez que alguien aparte una cita.',
            '/admin',
            'prueba',
        )));
    }

    /**
     * @return \App\Model\Entity\Usuario
     */
    private function usuario(): Usuario
    {
        $usuario = $this->Authentication->getIdentity()?->getOriginalData();
        if (!$usuario instanceof Usuario) {
            throw new UnauthorizedException();
        }

        return $usuario;
    }
}
