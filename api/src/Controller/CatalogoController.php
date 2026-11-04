<?php
declare(strict_types=1);

namespace App\Controller;

use App\Model\Entity\Categoria;
use App\Model\Entity\Trabajo;
use App\Model\Table\CategoriasTable;
use App\Model\Table\TrabajosTable;

/** Catálogo público. */
class CatalogoController extends AppController
{
    protected TrabajosTable $Trabajos;
    protected CategoriasTable $Categorias;

    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->Trabajos = $this->fetchTable('Trabajos');
        $this->Categorias = $this->fetchTable('Categorias');
    }

    /** GET /catalogo: categorías y diseños visibles, en orden. */
    public function index(): void
    {
        $categorias = $this->Categorias->find('ordenadas')->all()
            ->map(fn(Categoria $c) => $c->aPublico())
            ->toList();
        $trabajos = $this->Trabajos->find('publicos')->all()
            ->map(fn(Trabajo $t) => $t->aPublico())
            ->toList();

        $this->json(['categorias' => $categorias, 'trabajos' => $trabajos]);
    }

    /** GET /catalogo/{codigo}: un diseño visible ('ni-25' o 'NI-25'). */
    public function view(string $codigo): void
    {
        /** @var \App\Model\Entity\Trabajo $trabajo */
        $trabajo = $this->Trabajos->find('publicos')
            ->find('porCodigo', codigo: $codigo)
            ->firstOrFail();

        $this->json(['trabajo' => $trabajo->aPublico()]);
    }
}
