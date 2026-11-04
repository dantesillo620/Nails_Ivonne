<?php
declare(strict_types=1);

use Migrations\BaseSeed;

/**
 * Ajustes iniciales, tomados de SITE.agenda en src/app/core/site.config.ts.
 *
 *   bin/cake seeds run Ajustes
 *
 * No sobrescribe un ajuste que ya existe (Ivonne pudo haberlo cambiado en el panel).
 */
class AjustesSeed extends BaseSeed
{
    /**
     * @inheritDoc
     */
    public function run(): void
    {
        $this->insertOrSkip('ajustes', [
            'clave' => 'agenda',
            'valor' => json_encode([
                // 0 domingo … 6 sábado.
                'dias' => [1, 2, 3, 4, 5, 6],
                // Horas de inicio de cita, formato 24 h.
                'horas' => ['16:00', '18:00'],
                'semanas' => 2,
                'anticipacionMinutos' => 60,
                // Por confirmar con Ivonne: el teléfono es de Utah (+1 385).
                'zonaHoraria' => 'America/Denver',
            ], JSON_THROW_ON_ERROR),
            'modified' => date('Y-m-d H:i:s'),
        ]);
    }
}
