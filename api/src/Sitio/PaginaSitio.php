<?php
declare(strict_types=1);

namespace App\Sitio;

/**
 * Toma el index.csr.html del sitio Angular y le pone las meta tags de una página,
 * las mismas que genera SeoService en el front: título, descripción, canonical,
 * Open Graph y Twitter Card. Así WhatsApp y Google ven la página completa aunque
 * no se haya prerenderizado (los rastreadores de WhatsApp no ejecutan JavaScript).
 */
class PaginaSitio
{
    /**
     * @param string $shell HTML de index.csr.html.
     */
    public function __construct(private string $shell)
    {
    }

    /**
     * @param array{
     *   titulo: string,
     *   descripcion: string,
     *   url: string,
     *   sitio: string,
     *   imagen?: string,
     *   imagenAncho?: int,
     *   imagenAlto?: int,
     *   imagenAlt?: string,
     *   noindex?: bool,
     * } $meta Datos de la página; las URL deben ser absolutas.
     * @return string
     */
    public function conMetas(array $meta): string
    {
        $props = [
            'og:site_name' => $meta['sitio'],
            'og:locale' => 'es_MX',
            'og:type' => 'website',
            'og:title' => $meta['titulo'],
            'og:description' => $meta['descripcion'],
            'og:url' => $meta['url'],
        ];
        $nombres = [
            'description' => $meta['descripcion'],
            'robots' => empty($meta['noindex']) ? 'index, follow' : 'noindex, follow',
            'twitter:card' => 'summary_large_image',
            'twitter:title' => $meta['titulo'],
            'twitter:description' => $meta['descripcion'],
        ];
        if (isset($meta['imagen'])) {
            $props['og:image'] = $meta['imagen'];
            $props['og:image:width'] = (string)($meta['imagenAncho'] ?? '');
            $props['og:image:height'] = (string)($meta['imagenAlto'] ?? '');
            $props['og:image:alt'] = $meta['imagenAlt'] ?? '';
            $nombres['twitter:image'] = $meta['imagen'];
        }

        $tags = [];
        foreach ($nombres as $nombre => $valor) {
            $tags[] = sprintf('<meta name="%s" content="%s">', $nombre, $this->e($valor));
        }
        foreach (array_filter($props, fn($v) => $v !== '') as $prop => $valor) {
            $tags[] = sprintf('<meta property="%s" content="%s">', $prop, $this->e($valor));
        }
        $tags[] = sprintf('<link rel="canonical" href="%s">', $this->e($meta['url']));

        // Se quitan las que trae el index.html para no duplicarlas.
        $html = (string)preg_replace(
            '#\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>#is',
            '',
            $this->shell,
        );
        $html = (string)preg_replace('#\s*<link\s+rel="canonical"[^>]*>#is', '', $html);
        $html = (string)preg_replace(
            '#<title>.*?</title>#is',
            '<title>' . $this->e($meta['titulo']) . '</title>',
            $html,
            1,
        );

        return (string)preg_replace('#</head>#i', '  ' . implode("\n  ", $tags) . "\n</head>", $html, 1);
    }

    /**
     * @param string $texto Texto.
     * @return string
     */
    private function e(string $texto): string
    {
        return htmlspecialchars($texto, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
