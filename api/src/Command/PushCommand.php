<?php
declare(strict_types=1);

namespace App\Command;

use App\Push\Notificador;
use Cake\Command\Command;
use Cake\Console\Arguments;
use Cake\Console\ConsoleIo;
use Cake\Console\ConsoleOptionParser;
use Minishlink\WebPush\VAPID;

/**
 * Notificaciones del panel.
 *
 *   bin/cake push claves    genera las claves VAPID (una sola vez por servidor)
 *   bin/cake push prueba    manda un aviso de prueba a todos los dispositivos suscritos
 */
class PushCommand extends Command
{
    /**
     * @inheritDoc
     */
    public static function getDescription(): string
    {
        return 'Claves y pruebas de las notificaciones del panel.';
    }

    /**
     * @inheritDoc
     */
    protected function buildOptionParser(ConsoleOptionParser $parser): ConsoleOptionParser
    {
        return $parser
            ->setDescription(static::getDescription())
            ->addArgument('accion', [
                'help' => 'claves o prueba',
                'required' => true,
                'choices' => ['claves', 'prueba'],
            ]);
    }

    /**
     * @inheritDoc
     */
    public function execute(Arguments $args, ConsoleIo $io): int
    {
        if ($args->getArgument('accion') === 'claves') {
            $claves = VAPID::createVapidKeys();
            $io->out('Agrega esto a config/app_local.php (no lo subas a git):');
            $io->out('');
            $io->out("    'Push' => [");
            $io->out("        'publicKey' => '{$claves['publicKey']}',");
            $io->out("        'privateKey' => '{$claves['privateKey']}',");
            $io->out('    ],');
            $io->out('');
            $io->warning('Si cambias las claves, cada dispositivo tiene que volver a activar los avisos.');

            return static::CODE_SUCCESS;
        }

        /** @var \App\Model\Table\PushSuscripcionesTable $tabla */
        $tabla = $this->fetchTable('PushSuscripciones');
        $notificador = Notificador::desdeConfig($tabla);
        if (!$notificador->configurado()) {
            $io->error('Faltan las claves: corre `bin/cake push claves` y agrégalas a config/app_local.php.');

            return static::CODE_ERROR;
        }
        $r = $notificador->aTodos(Notificador::notificacion(
            'Prueba de avisos',
            'Si ves esto, los avisos del panel funcionan.',
            '/admin',
            'prueba',
        ));
        $io->out(sprintf('Enviadas: %d · fallidas: %d · dispositivos dados de baja: %d', ...array_values($r)));

        return $r['fallidas'] > 0 ? static::CODE_ERROR : static::CODE_SUCCESS;
    }
}
