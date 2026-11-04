<?php
declare(strict_types=1);

namespace App\Controller\Admin;

use App\Fotos\FotoInvalidaException;
use App\Fotos\ProcesadorFotos;
use App\Model\Entity\Categoria;
use App\Model\Entity\Trabajo;
use App\Model\Table\CategoriasTable;
use App\Model\Table\TrabajosTable;
use Cake\Core\Configure;
use Cake\Datasource\EntityInterface;
use Psr\Http\Message\UploadedFileInterface;

/**
 * Catálogo desde el panel. Los cambios se ven en el sitio al recargar: el sitio
 * pide el catálogo fresco a /catalogo.
 *
 * Los errores de datos responden 422 con {message, errores: {campo: mensaje}},
 * con mensajes escritos para mostrárselos a Ivonne tal cual.
 */
class CatalogoController extends AppController
{
    /** Campos de texto que se pueden cambiar desde el panel. */
    private const CAMPOS = ['titulo', 'alt', 'categoria_id', 'destacado', 'visible'];

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

    /**
     * GET /admin/catalogo: categorías y todos los diseños, también los ocultos.
     *
     * @return void
     */
    public function index(): void
    {
        $this->json([
            'categorias' => $this->Categorias->find('ordenadas')->all()
                ->map(fn(Categoria $c) => $c->aPublico())->toList(),
            'trabajos' => $this->Trabajos->find('panel')->all()
                ->map(fn(Trabajo $t) => $t->aPanel())->toList(),
        ]);
    }

    /**
     * POST /admin/trabajos (multipart): foto, titulo, alt, categoria, destacado, visible.
     * El diseño nuevo recibe el siguiente código y aparece primero en el catálogo.
     *
     * @return void
     */
    public function add(): void
    {
        $this->request->allowMethod('post');
        [$datos, $errores] = $this->datos();

        // Se valida el texto antes de procesar la foto, que es lo más tardado.
        $trabajo = $this->Trabajos->newEntity($datos + [
            'codigo' => 'NI-00',
            'imagen_base' => '-',
            'imagen_ancho' => 1,
            'imagen_alto' => 1,
            'imagen_anchos' => '1',
        ], ['fields' => [...self::CAMPOS, 'codigo', 'imagen_base', 'imagen_ancho', 'imagen_alto', 'imagen_anchos']]);
        $errores += $this->errores($trabajo);

        $foto = $this->request->getData('foto');
        if (!$foto instanceof UploadedFileInterface || $foto->getError() === UPLOAD_ERR_NO_FILE) {
            $errores['foto'] = 'Elige una foto del diseño.';
        }
        if ($errores) {
            $this->fallo($errores);

            return;
        }
        assert($foto instanceof UploadedFileInterface);

        $codigo = $this->Trabajos->siguienteCodigo();
        $procesador = $this->procesador();
        try {
            $imagen = $procesador->procesar($foto, strtolower($codigo) . '-' . bin2hex(random_bytes(2)));
        } catch (FotoInvalidaException $e) {
            $this->fallo(['foto' => $e->getMessage()]);

            return;
        }

        $trabajo->set($imagen + ['codigo' => $codigo, 'orden' => $this->Trabajos->ordenAlInicio()]);
        if (!$this->Trabajos->save($trabajo)) {
            $procesador->borrar($imagen['imagen_base']);
            $this->fallo($this->errores($trabajo));

            return;
        }

        $this->response = $this->response->withStatus(201);
        $this->json(['trabajo' => $this->recargar($trabajo)->aPanel()]);
    }

    /**
     * PATCH /admin/trabajos/{id}: titulo, alt, categoria, destacado o visible.
     *
     * @param string $id Id interno del diseño.
     * @return void
     */
    public function edit(string $id): void
    {
        $this->request->allowMethod(['patch', 'put']);
        $trabajo = $this->Trabajos->get($id);
        [$datos, $errores] = $this->datos();
        $this->Trabajos->patchEntity($trabajo, $datos, ['fields' => self::CAMPOS]);
        $errores += $this->errores($trabajo);
        if ($errores || !$this->Trabajos->save($trabajo)) {
            $this->fallo($errores + $this->errores($trabajo));

            return;
        }

        $this->json(['trabajo' => $this->recargar($trabajo)->aPanel()]);
    }

    /**
     * PUT /admin/trabajos/orden con {ids: [...]}: el orden nuevo del catálogo.
     * Los diseños que no vengan en la lista quedan al final, en su orden de antes.
     *
     * @return void
     */
    public function orden(): void
    {
        $this->request->allowMethod(['put', 'post']);
        $ids = $this->request->getData('ids');
        if (!is_array($ids) || $ids === [] || array_filter($ids, fn($id) => !is_numeric($id))) {
            $this->fallo(['ids' => 'Falta el orden de los diseños.']);

            return;
        }
        $ids = array_values(array_unique(array_map('intval', $ids)));

        $todos = $this->Trabajos->find('panel')->all()->toList();
        $existentes = array_map(fn(Trabajo $t) => $t->id, $todos);
        if (array_diff($ids, $existentes)) {
            $this->fallo(['ids' => 'Algún diseño ya no existe. Recarga el panel.']);

            return;
        }
        $resto = array_values(array_diff($existentes, $ids));

        $this->Trabajos->getConnection()->transactional(function () use ($ids, $resto): void {
            foreach (array_merge($ids, $resto) as $i => $id) {
                $this->Trabajos->updateAll(['orden' => $i + 1], ['id' => $id]);
            }
        });

        $this->index();
    }

    /**
     * DELETE /admin/trabajos/{id}: borra el diseño y, si la foto se subió desde el panel, sus archivos.
     *
     * @param string $id Id interno del diseño.
     * @return void
     */
    public function delete(string $id): void
    {
        $this->request->allowMethod('delete');
        $trabajo = $this->Trabajos->get($id);
        $this->Trabajos->deleteOrFail($trabajo);
        $this->procesador()->borrar($trabajo->imagen_base);

        $this->json(['ok' => true]);
    }

    /**
     * Lee los campos del formulario. 'categoria' llega como slug ('arte') o vacía.
     *
     * @return array{0: array<string, mixed>, 1: array<string, string>}
     */
    private function datos(): array
    {
        $datos = [];
        $errores = [];
        foreach (['titulo', 'alt'] as $campo) {
            $valor = $this->request->getData($campo);
            if ($valor !== null) {
                $datos[$campo] = trim((string)$valor);
            }
        }
        foreach (['destacado', 'visible'] as $campo) {
            $valor = $this->request->getData($campo);
            if ($valor !== null) {
                $datos[$campo] = filter_var($valor, FILTER_VALIDATE_BOOLEAN);
            }
        }
        if ($this->request->getData('categoria') !== null) {
            $slug = (string)$this->request->getData('categoria');
            $categoria = $slug === '' ? null : $this->Categorias->find()->where(['slug' => $slug])->first();
            if ($slug !== '' && $categoria === null) {
                $errores['categoria'] = 'Esa categoría no existe.';
            }
            $datos['categoria_id'] = $categoria?->get('id');
        }

        return [$datos, $errores];
    }

    /**
     * Errores de validación como {campo: primer mensaje}. 'categoria_id' se informa como 'categoria'.
     *
     * @param \Cake\Datasource\EntityInterface $entidad Entidad validada.
     * @return array<string, string>
     */
    private function errores(EntityInterface $entidad): array
    {
        $errores = [];
        foreach ($entidad->getErrors() as $campo => $mensajes) {
            $campo = $campo === 'categoria_id' ? 'categoria' : $campo;
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

    /**
     * @param \App\Model\Entity\Trabajo $trabajo Diseño guardado.
     * @return \App\Model\Entity\Trabajo
     */
    private function recargar(Trabajo $trabajo): Trabajo
    {
        return $this->Trabajos->get($trabajo->id, contain: ['Categorias']);
    }

    /**
     * @return \App\Fotos\ProcesadorFotos
     */
    private function procesador(): ProcesadorFotos
    {
        return new ProcesadorFotos(
            (string)Configure::read('Fotos.dir'),
            (string)Configure::read('Fotos.url'),
            (int)Configure::read('Fotos.maxBytes'),
        );
    }
}
