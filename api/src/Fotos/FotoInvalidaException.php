<?php
declare(strict_types=1);

namespace App\Fotos;

use RuntimeException;

/** La foto subida no se puede usar. El mensaje está escrito para mostrárselo a Ivonne. */
class FotoInvalidaException extends RuntimeException
{
}
