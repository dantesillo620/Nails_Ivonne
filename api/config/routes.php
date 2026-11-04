<?php
declare(strict_types=1);

/**
 * Rutas de la API.
 *
 * Las rutas no llevan el prefijo /api: en producción la app vive en /api del
 * dominio (CakePHP detecta esa base) y en desarrollo el proxy de Angular lo quita.
 */

use Cake\Routing\Route\DashedRoute;
use Cake\Routing\RouteBuilder;

return function (RouteBuilder $routes): void {
    $routes->setRouteClass(DashedRoute::class);

    $routes->scope('/', function (RouteBuilder $builder): void {
        $builder->get('/', ['controller' => 'Estado', 'action' => 'index']);

        $builder->get('/catalogo', ['controller' => 'Catalogo', 'action' => 'index']);
        $builder->get('/catalogo/{codigo}', ['controller' => 'Catalogo', 'action' => 'view'])
            ->setPatterns(['codigo' => '[A-Za-z]{2,4}-\d{2,4}'])
            ->setPass(['codigo']);

        // Páginas del sitio que arma PHP (el .htaccess del sitio las manda aquí en Hostinger).
        $builder->get('/disenos/{codigo}', ['controller' => 'Sitio', 'action' => 'diseno'])
            ->setPatterns(['codigo' => '[A-Za-z0-9-]{1,20}'])
            ->setPass(['codigo']);
        $builder->get('/sitemap.xml', ['controller' => 'Sitio', 'action' => 'sitemap']);

        // Agenda pública.
        $builder->get('/agenda/disponibilidad', ['controller' => 'Agenda', 'action' => 'disponibilidad']);
        $builder->post('/agenda/citas', ['controller' => 'Agenda', 'action' => 'crear']);

        // Sesión del panel.
        $builder->get('/auth/sesion', ['controller' => 'Auth', 'action' => 'sesion']);
        $builder->post('/auth/login', ['controller' => 'Auth', 'action' => 'login']);
        $builder->post('/auth/logout', ['controller' => 'Auth', 'action' => 'logout']);
    });

    // Panel de administración: todo pide sesión (Admin\AppController).
    $routes->prefix('Admin', ['path' => '/admin'], function (RouteBuilder $builder): void {
        $builder->get('/catalogo', ['controller' => 'Catalogo', 'action' => 'index']);
        $builder->post('/trabajos', ['controller' => 'Catalogo', 'action' => 'add']);
        $builder->put('/trabajos/orden', ['controller' => 'Catalogo', 'action' => 'orden']);
        $builder->patch('/trabajos/{id}', ['controller' => 'Catalogo', 'action' => 'edit'])
            ->setPatterns(['id' => '\d+'])
            ->setPass(['id']);
        $builder->delete('/trabajos/{id}', ['controller' => 'Catalogo', 'action' => 'delete'])
            ->setPatterns(['id' => '\d+'])
            ->setPass(['id']);

        $builder->get('/agenda', ['controller' => 'Agenda', 'action' => 'index']);
        $builder->post('/citas', ['controller' => 'Agenda', 'action' => 'crear']);
        $builder->patch('/citas/{id}', ['controller' => 'Agenda', 'action' => 'estado'])
            ->setPatterns(['id' => '\d+'])
            ->setPass(['id']);
        $builder->get('/push', ['controller' => 'Push', 'action' => 'index']);
        $builder->post('/push/suscripciones', ['controller' => 'Push', 'action' => 'suscribir']);
        // POST y no DELETE: algunos servidores descartan el cuerpo de un DELETE.
        $builder->post('/push/suscripciones/quitar', ['controller' => 'Push', 'action' => 'quitar']);
        $builder->post('/push/prueba', ['controller' => 'Push', 'action' => 'prueba']);
        $builder->patch('/push/ajustes', ['controller' => 'Push', 'action' => 'ajustes']);
        $builder->post('/bloqueos', ['controller' => 'Agenda', 'action' => 'bloquear']);
        $builder->delete('/bloqueos/{id}', ['controller' => 'Agenda', 'action' => 'desbloquear'])
            ->setPatterns(['id' => '\d+'])
            ->setPass(['id']);
    });
};
