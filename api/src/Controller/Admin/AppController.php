<?php
declare(strict_types=1);

namespace App\Controller\Admin;

use App\Controller\AppController as BaseController;

/**
 * Base de las rutas /admin: todas piden sesión abierta. Sin sesión responden
 * 401 en JSON y el panel manda a la pantalla de entrar.
 */
class AppController extends BaseController
{
    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->loadComponent('Authentication.Authentication');
    }
}
