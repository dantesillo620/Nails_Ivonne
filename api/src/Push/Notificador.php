<?php
declare(strict_types=1);

namespace App\Push;

use App\Model\Entity\PushSuscripcion;
use App\Model\Table\PushSuscripcionesTable;
use Cake\Core\Configure;
use Cake\Http\Client;
use Cake\Log\Log;
use Laminas\Diactoros\RequestFactory;
use Laminas\Diactoros\StreamFactory;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Manda notificaciones (Web Push) a los dispositivos donde Ivonne activó los avisos.
 *
 * El contenido usa el formato que entiende el service worker de Angular (ngsw): al tocar
 * la notificación abre (o enfoca) el panel en la URL indicada.
 *
 * Nunca lanza excepciones: un aviso que no sale no debe impedir, por ejemplo, que una
 * clienta aparte su cita. Los errores quedan en el log.
 */
class Notificador
{
    /** Segundos máximos para hablar con un servicio de push. */
    private const TIEMPO_MAXIMO = 5;

    /**
     * @param \App\Model\Table\PushSuscripcionesTable $suscripciones Tabla de dispositivos.
     * @param \Minishlink\WebPush\WebPush|null $webPush null si faltan las claves VAPID.
     */
    public function __construct(
        private PushSuscripcionesTable $suscripciones,
        private ?WebPush $webPush,
    ) {
    }

    /**
     * @param \App\Model\Table\PushSuscripcionesTable $suscripciones Tabla de dispositivos.
     * @return self
     */
    public static function desdeConfig(PushSuscripcionesTable $suscripciones): self
    {
        $publica = (string)Configure::read('Push.publicKey');
        $privada = (string)Configure::read('Push.privateKey');
        if ($publica === '' || $privada === '') {
            return new self($suscripciones, null);
        }

        try {
            $webPush = new WebPush(
                ['VAPID' => [
                    'subject' => (string)Configure::read('Push.subject'),
                    'publicKey' => $publica,
                    'privateKey' => $privada,
                ]],
                ['TTL' => 60 * 60 * 24],
                new Client(['timeout' => self::TIEMPO_MAXIMO]),
                new RequestFactory(),
                new StreamFactory(),
            );
            $webPush->setReuseVAPIDHeaders(true);
        } catch (Throwable $e) {
            Log::error('Push: no se pudo preparar el envío: ' . $e->getMessage());
            $webPush = null;
        }

        return new self($suscripciones, $webPush);
    }

    /**
     * Si hay claves VAPID para mandar avisos.
     *
     * @return bool
     */
    public function configurado(): bool
    {
        return $this->webPush !== null;
    }

    /**
     * Contenido de una notificación para el service worker de Angular.
     *
     * @param string $titulo Título.
     * @param string $cuerpo Texto.
     * @param string $url Ruta que abre al tocarla ('/admin').
     * @param string $etiqueta Las notificaciones con la misma etiqueta se reemplazan en vez de acumularse.
     * @return array<string, mixed>
     */
    public static function notificacion(string $titulo, string $cuerpo, string $url, string $etiqueta): array
    {
        return [
            'notification' => [
                'title' => $titulo,
                'body' => $cuerpo,
                'icon' => '/brand/app/panel-192.png',
                'badge' => '/brand/app/insignia-96.png',
                'tag' => $etiqueta,
                'renotify' => true,
                'lang' => 'es-MX',
                'data' => [
                    'onActionClick' => [
                        'default' => ['operation' => 'navigateLastFocusedOrOpen', 'url' => $url],
                    ],
                ],
            ],
        ];
    }

    /**
     * Manda la notificación a todos los dispositivos de todas las cuentas del panel.
     *
     * @param array<string, mixed> $notificacion Ver notificacion().
     * @return array{enviadas: int, fallidas: int, borradas: int}
     */
    public function aTodos(array $notificacion): array
    {
        return $this->enviar($this->suscripciones->find()->all()->toList(), $notificacion);
    }

    /**
     * @param int $usuarioId Cuenta del panel.
     * @param array<string, mixed> $notificacion Ver notificacion().
     * @return array{enviadas: int, fallidas: int, borradas: int}
     */
    public function aUsuario(int $usuarioId, array $notificacion): array
    {
        return $this->enviar(
            $this->suscripciones->find()->where(['usuario_id' => $usuarioId])->all()->toList(),
            $notificacion,
        );
    }

    /**
     * Los dispositivos que el servicio de push da por perdidos (desinstalaron la app, quitaron
     * el permiso) se borran para no seguir intentando.
     *
     * @param list<\App\Model\Entity\PushSuscripcion> $destinos Dispositivos.
     * @param array<string, mixed> $notificacion Ver notificacion().
     * @return array{enviadas: int, fallidas: int, borradas: int}
     */
    public function enviar(array $destinos, array $notificacion): array
    {
        $r = ['enviadas' => 0, 'fallidas' => 0, 'borradas' => 0];
        if ($this->webPush === null || $destinos === []) {
            return $r;
        }

        try {
            $payload = json_encode($notificacion, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            foreach ($destinos as $s) {
                $this->webPush->queueNotification($this->suscripcion($s), $payload, ['urgency' => 'high']);
            }
            foreach ($this->webPush->flush() as $reporte) {
                if ($reporte->isSuccess()) {
                    $r['enviadas']++;
                    continue;
                }
                $r['fallidas']++;
                if ($reporte->isSubscriptionExpired()) {
                    $r['borradas'] += $this->suscripciones->deleteAll(['endpoint' => $reporte->getEndpoint()]);
                } else {
                    Log::warning('Push: no se entregó un aviso: ' . $reporte->getReason());
                }
            }
        } catch (Throwable $e) {
            Log::error('Push: error al enviar: ' . $e->getMessage());
            $r['fallidas'] = max($r['fallidas'], count($destinos) - $r['enviadas']);
        }

        return $r;
    }

    /**
     * @param \App\Model\Entity\PushSuscripcion $s Dispositivo.
     * @return \Minishlink\WebPush\Subscription
     */
    private function suscripcion(PushSuscripcion $s): Subscription
    {
        return Subscription::create([
            'endpoint' => $s->endpoint,
            'keys' => ['p256dh' => $s->p256dh, 'auth' => $s->auth],
            'contentEncoding' => 'aes128gcm',
        ]);
    }
}
