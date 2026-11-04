<?php
declare(strict_types=1);

namespace App\Controller;

use Cake\Controller\Controller;
use Cake\Event\EventInterface;
use Cake\View\JsonView;

/**
 * Base de la API: todas las respuestas son JSON.
 *
 * Las acciones llaman a json(['clave' => valor, ...]) y cada clave se serializa
 * en la respuesta.
 */
class AppController extends Controller
{
    /**
     * @inheritDoc
     */
    public function beforeRender(EventInterface $event): void
    {
        parent::beforeRender($event);
        $this->viewBuilder()
            ->setClassName(JsonView::class)
            ->setOption('jsonOptions', JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @param array<string, mixed> $datos
     */
    protected function json(array $datos): void
    {
        $this->set($datos);
        $this->viewBuilder()->setOption('serialize', array_keys($datos));
    }
}
