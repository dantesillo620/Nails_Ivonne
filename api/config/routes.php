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
    });
};
