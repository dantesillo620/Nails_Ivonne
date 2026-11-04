<?php
declare(strict_types=1);

namespace App\Controller;

/**
 * Comprueba que la API responde (útil al publicar en el hosting).
 */
class EstadoController extends AppController
{
    /**
     * GET /
     *
     * @return void
     */
    public function index(): void
    {
        $this->json(['ok' => true, 'servicio' => 'Nails Ivonne API']);
    }
}
