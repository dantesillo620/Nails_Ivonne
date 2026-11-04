<?php
declare(strict_types=1);

namespace App\Controller;

use App\Model\Entity\Usuario;
use App\Model\Table\UsuariosTable;
use Cake\Cache\Cache;
use Cake\Http\Exception\BadRequestException;
use Cake\Http\Exception\HttpException;
use Cake\Http\Exception\UnauthorizedException;

/**
 * Sesión del panel.
 *
 * El panel (Angular) llama primero a GET /auth/sesion: además de decir si hay sesión,
 * entrega el token CSRF que debe mandar en la cabecera X-CSRF-Token de cada POST,
 * PATCH o DELETE (la cookie CSRF vive en /api y el panel no puede leerla).
 */
class AuthController extends AppController
{
    /** Intentos fallidos permitidos por IP y por correo antes de esperar 15 minutos. */
    public const MAX_INTENTOS = 5;

    /** Hash de una contraseña al azar que nadie conoce. */
    private const HASH_FALSO = '$2y$10$zlUsrs4VGD1zhsBZvg.T0OQsIzlDcr7rigJedkfakzKNt1gAUjSoG';

    protected UsuariosTable $Usuarios;

    /**
     * @inheritDoc
     */
    public function initialize(): void
    {
        parent::initialize();
        $this->loadComponent('Authentication.Authentication');
        $this->Authentication->allowUnauthenticated(['sesion', 'login', 'logout']);
        $this->Usuarios = $this->fetchTable('Usuarios');
    }

    /**
     * GET /auth/sesion
     *
     * @return void
     */
    public function sesion(): void
    {
        $this->json(['usuario' => $this->usuarioActual(), 'csrfToken' => $this->request->getAttribute('csrfToken')]);
    }

    /**
     * POST /auth/login con {email, password}.
     *
     * @return void
     */
    public function login(): void
    {
        $this->request->allowMethod('post');
        $email = strtolower(trim((string)$this->request->getData('email')));
        $password = (string)$this->request->getData('password');
        if ($email === '' || $password === '') {
            throw new BadRequestException('Escribe tu correo y tu contraseña.');
        }

        $claves = ['ip_' . sha1((string)$this->request->clientIp()), 'email_' . sha1($email)];
        foreach ($claves as $clave) {
            if ((int)Cache::read($clave, 'intentos') >= self::MAX_INTENTOS) {
                throw new HttpException('Demasiados intentos. Espera 15 minutos y vuelve a intentar.', 429);
            }
        }

        /** @var \App\Model\Entity\Usuario|null $usuario */
        $usuario = $this->Usuarios->find()->where(['email' => $email])->first();
        // Se verifica aunque el correo no exista, para no revelar qué correos tienen cuenta.
        $hash = $usuario->password ?? self::HASH_FALSO;
        if (!password_verify($password, $hash) || $usuario === null) {
            foreach ($claves as $clave) {
                Cache::write($clave, (int)Cache::read($clave, 'intentos') + 1, 'intentos');
            }
            throw new UnauthorizedException('El correo o la contraseña no coinciden.');
        }

        foreach ($claves as $clave) {
            Cache::delete($clave, 'intentos');
        }
        if (password_needs_rehash($usuario->password, PASSWORD_DEFAULT)) {
            $usuario->set('password', $password);
            $this->Usuarios->save($usuario);
        }

        $this->Authentication->setIdentity($usuario);
        $this->json([
            'usuario' => $this->publico($usuario),
            // La sesión se renovó: el panel debe usar este token de aquí en adelante.
            'csrfToken' => $this->request->getAttribute('csrfToken'),
        ]);
    }

    /**
     * POST /auth/logout
     *
     * @return void
     */
    public function logout(): void
    {
        $this->request->allowMethod('post');
        $this->Authentication->logout();
        $this->json(['usuario' => null]);
    }

    /**
     * @return array{id: int, nombre: string, email: string}|null
     */
    private function usuarioActual(): ?array
    {
        $identidad = $this->Authentication->getIdentity()?->getOriginalData();

        return $identidad instanceof Usuario ? $this->publico($identidad) : null;
    }

    /**
     * @param \App\Model\Entity\Usuario $usuario Usuario.
     * @return array{id: int, nombre: string, email: string}
     */
    private function publico(Usuario $usuario): array
    {
        return ['id' => $usuario->id, 'nombre' => $usuario->nombre, 'email' => $usuario->email];
    }
}
