<?php
declare(strict_types=1);

namespace App\Command;

use App\Model\Table\UsuariosTable;
use Cake\Command\Command;
use Cake\Console\Arguments;
use Cake\Console\ConsoleIo;
use Cake\Console\ConsoleOptionParser;

/**
 * Cuentas del panel.
 *
 *   bin/cake usuario crear ivonne@correo.com "Ivonne"
 *   bin/cake usuario contrasena ivonne@correo.com
 *
 * La contraseña se pide en la terminal sin mostrarse (no se pasa como argumento
 * para que no quede en el historial).
 */
class UsuarioCommand extends Command
{
    /**
     * @inheritDoc
     */
    public static function getDescription(): string
    {
        return 'Crea una cuenta del panel o cambia su contraseña.';
    }

    /**
     * @inheritDoc
     */
    protected function buildOptionParser(ConsoleOptionParser $parser): ConsoleOptionParser
    {
        return $parser
            ->setDescription(static::getDescription())
            ->addArgument('accion', [
                'help' => 'crear o contrasena',
                'required' => true,
                'choices' => ['crear', 'contrasena'],
            ])
            ->addArgument('email', ['help' => 'Correo para entrar al panel', 'required' => true])
            ->addArgument('nombre', ['help' => 'Nombre que se muestra en el panel (solo al crear)']);
    }

    /**
     * @inheritDoc
     */
    public function execute(Arguments $args, ConsoleIo $io): int
    {
        /** @var \App\Model\Table\UsuariosTable $usuarios */
        $usuarios = $this->fetchTable('Usuarios');
        $email = strtolower(trim((string)$args->getArgument('email')));

        return $args->getArgument('accion') === 'crear'
            ? $this->crear($usuarios, $email, (string)$args->getArgument('nombre'), $io)
            : $this->cambiar($usuarios, $email, $io);
    }

    /**
     * @param \App\Model\Table\UsuariosTable $usuarios Tabla.
     * @param string $email Correo.
     * @param string $nombre Nombre.
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @return int
     */
    private function crear(UsuariosTable $usuarios, string $email, string $nombre, ConsoleIo $io): int
    {
        if (trim($nombre) === '') {
            $io->error('Falta el nombre: bin/cake usuario crear <email> "<nombre>"');

            return static::CODE_ERROR;
        }
        $password = $this->pedirContrasena($io);
        if ($password === null) {
            return static::CODE_ERROR;
        }

        $usuario = $usuarios->newEntity(['email' => $email, 'nombre' => trim($nombre), 'password' => $password]);
        if (!$usuarios->save($usuario)) {
            $this->mostrarErrores($usuario->getErrors(), $io);

            return static::CODE_ERROR;
        }
        $io->success("Cuenta creada: {$usuario->email}");

        return static::CODE_SUCCESS;
    }

    /**
     * @param \App\Model\Table\UsuariosTable $usuarios Tabla.
     * @param string $email Correo.
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @return int
     */
    private function cambiar(UsuariosTable $usuarios, string $email, ConsoleIo $io): int
    {
        /** @var \App\Model\Entity\Usuario|null $usuario */
        $usuario = $usuarios->find()->where(['email' => $email])->first();
        if ($usuario === null) {
            $io->error("No hay una cuenta con el correo {$email}.");

            return static::CODE_ERROR;
        }
        $password = $this->pedirContrasena($io);
        if ($password === null) {
            return static::CODE_ERROR;
        }

        $usuarios->patchEntity($usuario, ['password' => $password], ['fields' => ['password']]);
        if (!$usuarios->save($usuario)) {
            $this->mostrarErrores($usuario->getErrors(), $io);

            return static::CODE_ERROR;
        }
        $io->success("Contraseña cambiada para {$usuario->email}.");

        return static::CODE_SUCCESS;
    }

    /**
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @return string|null
     */
    private function pedirContrasena(ConsoleIo $io): ?string
    {
        $primera = $this->leerOculto($io, 'Contraseña (mínimo 10 caracteres): ');
        $segunda = $this->leerOculto($io, 'Repítela: ');
        if ($primera !== $segunda) {
            $io->error('Las contraseñas no coinciden.');

            return null;
        }

        return $primera;
    }

    /**
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @param string $pregunta Texto.
     * @return string
     */
    private function leerOculto(ConsoleIo $io, string $pregunta): string
    {
        $io->out($pregunta, 0);
        $terminal = function_exists('posix_isatty') && posix_isatty(STDIN);
        if ($terminal) {
            shell_exec('stty -echo');
        }
        $linea = fgets(STDIN);
        if ($terminal) {
            shell_exec('stty echo');
            $io->out('');
        }

        return rtrim((string)$linea, "\r\n");
    }

    /**
     * @param array<string, mixed> $errores Errores de validación.
     * @param \Cake\Console\ConsoleIo $io Consola.
     * @return void
     */
    private function mostrarErrores(array $errores, ConsoleIo $io): void
    {
        foreach ($errores as $campo => $mensajes) {
            foreach ((array)$mensajes as $mensaje) {
                $io->error("{$campo}: {$mensaje}");
            }
        }
    }
}
