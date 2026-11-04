<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller;

use Cake\Core\Configure;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class SitioControllerTest extends TestCase
{
    use IntegrationTestTrait;

    protected array $fixtures = ['app.Categorias', 'app.Trabajos'];

    protected function setUp(): void
    {
        parent::setUp();
        Configure::write('Sitio.shell', TESTS . 'files' . DS . 'index.csr.html');
        Configure::write('App.fullBaseUrl', 'https://nailsivonne.com');
    }

    public function testDisenoTraeSusMetaTagsParaWhatsApp(): void
    {
        $this->get('/disenos/ni-02');

        $this->assertResponseOk();
        $this->assertContentType('text/html');
        $this->assertResponseContains('<title>Vino con dije dorado (NI-02) | Nails Ivonne</title>');
        $this->assertResponseContains('<meta property="og:image" content="https://nailsivonne.com/images/trabajos/og/ni-02.jpg">');
        $this->assertResponseContains('<meta property="og:image:width" content="800">');
        $this->assertResponseContains('<meta property="og:image:height" content="1067">');
        $this->assertResponseContains('<meta property="og:url" content="https://nailsivonne.com/disenos/ni-02">');
        $this->assertResponseContains('<link rel="canonical" href="https://nailsivonne.com/disenos/ni-02">');
        $this->assertResponseContains('<meta name="description" content="Uñas de prueba. Diseño NI-02 de Nails Ivonne');
        $this->assertResponseContains('<meta name="robots" content="index, follow">');
        // Conserva el resto de la página para que Angular arranque.
        $this->assertResponseContains('<script src="main.js" type="module"></script>');
        $this->assertResponseContains('<meta name="theme-color" content="#faf6f0" />');
    }

    public function testNoDuplicaLaDescripcionDelSitio(): void
    {
        $this->get('/disenos/NI-02');

        $body = (string)$this->_response->getBody();
        $this->assertSame(1, substr_count($body, 'name="description"'));
        $this->assertStringNotContainsString('Descripción general del sitio.', $body);
        $this->assertSame(1, substr_count($body, '<title>'));
    }

    public function testEscapaLosTextos(): void
    {
        $trabajos = $this->getTableLocator()->get('Trabajos');
        $t = $trabajos->get(1);
        $t->set('titulo', 'Rosa "chicle" <b>');
        $trabajos->saveOrFail($t);

        $this->get('/disenos/ni-05');

        $this->assertResponseContains('<title>Rosa &quot;chicle&quot; &lt;b&gt; (NI-05) | Nails Ivonne</title>');
        $this->assertResponseNotContains('<b>');
    }

    public function testDisenoOcultoOInexistenteEs404SinIndexar(): void
    {
        foreach (['/disenos/ni-40', '/disenos/ni-99'] as $url) {
            $this->get($url);
            $this->assertResponseCode(404);
            $this->assertContentType('text/html');
            $this->assertResponseContains('<meta name="robots" content="noindex, follow">');
            $this->assertResponseNotContains('og:image');
            $this->assertResponseContains('<app-root></app-root>');
        }
    }

    public function testSitemapConLosDisenosVisibles(): void
    {
        $this->get('/sitemap.xml');

        $this->assertResponseOk();
        $this->assertContentType('application/xml');
        $this->assertResponseContains('<loc>https://nailsivonne.com/</loc>');
        $this->assertResponseContains('<loc>https://nailsivonne.com/disenos/ni-02</loc>');
        $this->assertResponseContains('<loc>https://nailsivonne.com/disenos/ni-41</loc>');
        $this->assertResponseNotContains('ni-40');
        $this->assertSame(4, substr_count((string)$this->_response->getBody(), '<loc>'));
    }
}
