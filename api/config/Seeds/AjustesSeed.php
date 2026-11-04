<?php
declare(strict_types=1);

use Migrations\BaseSeed;

/**
 * Ajustes iniciales: los mismos de SITE.agenda en src/app/core/site.config.ts.
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
                // El estudio está en Guadalajara.
                'zonaHoraria' => 'America/Mexico_City',
                // Horas de inicio por día (0 domingo … 6 sábado): cada 2 horas desde que abre hasta el cierre.
                // Un día sin horas no se atiende.
                'horas' => [
                    '1' => ['14:00', '16:00', '18:00', '20:00'],
                    '2' => ['14:00', '16:00', '18:00', '20:00'],
                    '3' => ['14:00', '16:00', '18:00', '20:00'],
                    '4' => ['14:00', '16:00', '18:00', '20:00'],
                    '5' => ['14:00', '16:00', '18:00', '20:00'],
                    '6' => ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
                ],
                'semanas' => 2,
                'anticipacionMinutos' => 60,
            ], JSON_THROW_ON_ERROR),
            'modified' => date('Y-m-d H:i:s'),
        ]);
    }
}
