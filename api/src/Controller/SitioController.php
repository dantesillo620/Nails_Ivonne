<?php
declare(strict_types=1);

namespace App\Controller;

use App\Model\Table\TrabajosTable;
use App\Sitio\PaginaSitio;
use Cake\Core\Configure;
use Cake\Http\Exception\InternalErrorException;
use Cake\Http\Response;
use Cake\Routing\Router;

/**
 * Páginas del sitio que necesitan datos al momento, no del build.
 *
 * En Hostinger, el .htaccess del sitio manda aquí /disenos/{codigo} cuando no existe
 * su página prerenderizada y también /sitemap.xml.
 */
class SitioController extends AppController
{
    protected TrabajosTable $Trabajos;

    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->Trabajos = $this->fetchTable('Trabajos');
    }

    /**
     * GET /disenos/{codigo}: el sitio con las meta tags del diseño. Angular hace el resto
     * en el navegador. Si el diseño no existe o está oculto, el sitio muestra su 404.
     *
     * @param string $codigo Código del diseño ('ni-37').
     * @return \Cake\Http\Response
     */
    public function diseno(string $codigo): Response
    {
        /** @var \App\Model\Entity\Trabajo|null $trabajo */
        $trabajo = $this->Trabajos->find('publicos')->find('porCodigo', codigo: $codigo)->first();
        $nombre = (string)Configure::read('Sitio.nombre');
        $base = Router::fullBaseUrl();

        if ($trabajo === null) {
            $html = $this->pagina()->conMetas([
                'titulo' => "Página no encontrada | {$nombre}",
                'descripcion' => 'Este diseño ya no está en el catálogo.',
                'url' => $base . '/disenos/' . strtolower($codigo),
                'sitio' => $nombre,
                'noindex' => true,
            ]);

            return $this->html($html)->withStatus(404);
        }

        $img = $trabajo->imagenCompartir();
        $html = $this->pagina()->conMetas([
            'titulo' => "{$trabajo->titulo} ({$trabajo->codigo}) | {$nombre}",
            'descripcion' => "{$trabajo->alt} Diseño {$trabajo->codigo} de {$nombre}: "
                . 'elígelo y agenda tu cita por WhatsApp.',
            'url' => $base . $trabajo->ruta(),
            'sitio' => $nombre,
            'imagen' => $base . $img['src'],
            'imagenAncho' => $img['width'],
            'imagenAlto' => $img['height'],
            'imagenAlt' => $trabajo->alt,
        ]);

        // Unos minutos de caché: si Ivonne corrige el título, se ve pronto.
        return $this->html($html)->withCache('-1 minute', '+5 minutes');
    }

    /**
     * GET /sitemap.xml: inicio y todos los diseños visibles.
     *
     * @return \Cake\Http\Response
     */
    public function sitemap(): Response
    {
        $base = Router::fullBaseUrl();
        $urls = [$base . '/'];
        foreach ($this->Trabajos->find('publicos')->all() as $trabajo) {
            /** @var \App\Model\Entity\Trabajo $trabajo */
            $urls[] = $base . $trabajo->ruta();
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $url) {
            $xml .= '  <url><loc>' . htmlspecialchars($url, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</loc></url>\n";
        }
        $xml .= "</urlset>\n";

        return $this->response->withType('xml')->withStringBody($xml)->withCache('-1 minute', '+1 hour');
    }

    /**
     * @return \App\Sitio\PaginaSitio
     */
    private function pagina(): PaginaSitio
    {
        $ruta = (string)Configure::read('Sitio.shell');
        $shell = is_file($ruta) ? file_get_contents($ruta) : false;
        if ($shell === false) {
            throw new InternalErrorException('No se encontró el sitio compilado (Sitio.shell).');
        }

        return new PaginaSitio($shell);
    }

    /**
     * @param string $html Página completa.
     * @return \Cake\Http\Response
     */
    private function html(string $html): Response
    {
        return $this->response->withType('html')->withCharset('UTF-8')->withStringBody($html);
    }
}
