# Explorador de contenido aleatorio

**Programación Web III** — Tarea de consumo de APIs públicas con `fetch` y `async/await`.

## Integrantes
- Lucas Boris Gomez Giles — GitHub: Its.Lu06

## Descripción
Página con cuatro tarjetas (citas, perros, gatos y datos curiosos). Cada tarjeta consulta su propia API al abrir la página y tiene su propio botón para pedir contenido nuevo **sin recargar la página**. Está alojada en un proyecto **ASP.NET Core MVC (.NET 10)**, que sirve `wwwroot/index.html`.

| Sección | API | Endpoint (GET) | Campo usado |
|---|---|---|---|
| Citas | DummyJSON | `https://dummyjson.com/quotes/random` | `quote` y `author` |
| Perros | Dog CEO | `https://dog.ceo/api/breeds/image/random` | `message` (URL de la imagen) |
| Gatos | CATAAS | `https://cataas.com/cat?json=true` | `id` → imagen en `https://cataas.com/cat/{id}` |
| Datos curiosos | Useless Facts | `https://uselessfacts.jsph.pl/api/v2/facts/random?language=en` | `text` |

## Estructura
```
wwwroot/
  index.html          Estructura de la página (Bootstrap)
  css/explorador.css  Estilos
  js/explorador.js    Lógica: consultas a las APIs y control de la interfaz
Program.cs            Sirve index.html (UseDefaultFiles + UseStaticFiles)
```

## Instrucciones de ejecución
**Requisitos:** .NET SDK 10.0 y conexión a Internet.

1. Abre `ConexionAPI.slnx` en Visual Studio y presiona `F5` (o `Ctrl + F5`).
2. También por consola, dentro de la carpeta del proyecto: `dotnet run`, y abre la URL que muestre (por ejemplo `http://localhost:5254`).
3. La página abre en la raíz `/` (también funciona `/Home`).

## Cómo funciona
- Una **función independiente por API**: `obtenerCita()`, `obtenerPerro()`, `obtenerGato()` y `obtenerDatoCurioso()`. Todas usan `solicitarJson()`, que ejecuta `fetch`, verifica `response.ok` y limita el tiempo de espera a 10 segundos.
- `actualizarSeccion()` controla el ciclo de cada tarjeta: muestra **“Cargando…”**, deshabilita el botón, consulta, dibuja el resultado y, en un bloque `finally`, vuelve a habilitar el botón aunque haya ocurrido un error.
- Si una consulta falla (sin Internet, error HTTP, JSON inesperado, imagen que no carga o tiempo agotado) se muestra un mensaje comprensible **solo en esa tarjeta**, con un botón **Reintentar**. Las demás tarjetas siguen funcionando.
- Las imágenes tienen un marco con proporción fija (4:3) y `object-fit: cover`, así que todas se ven del mismo tamaño y sin deformarse. Se precargan antes de mostrarse para detectar errores de carga, y llevan texto alternativo.
- Todo el contenido se inserta con `textContent`; no se escribe HTML recibido de las APIs.
- Diseño responsivo con Bootstrap: dos columnas en pantallas grandes y una en teléfonos.

## Cómo tomar las dos capturas
1. **Cuatro secciones funcionando:** abre la página con Internet y captura la pantalla completa.
2. **Error controlado:** con la página abierta, desconecta Internet (o en las herramientas del navegador, pestaña *Network* → *Offline*), presiona cualquier botón y captura el mensaje de error. Al reconectar, presiona **Reintentar**.

## Preguntas de reflexión

**1. ¿Qué es un endpoint y cuál utilizaste para cada API?**
Un endpoint es una dirección (URL) concreta de una API a la que se envía una solicitud para obtener o enviar un recurso. Cada uno responde una cosa distinta: por ejemplo, “dame una cita al azar”. Los que utilicé están en la tabla de arriba: `https://dummyjson.com/quotes/random` (citas), `https://dog.ceo/api/breeds/image/random` (perros), `https://cataas.com/cat?json=true` (gatos, que luego complementé con `https://cataas.com/cat/{id}` para la imagen) y `https://uselessfacts.jsph.pl/api/v2/facts/random?language=en` (datos curiosos).

**2. ¿Qué diferencia existe entre recibir JSON y recibir directamente una imagen?**
JSON es texto estructurado (pares clave-valor) que el programa puede leer y convertir en un objeto con `response.json()`. Una imagen directa son bytes binarios (por ejemplo `image/png`), que no son texto ni JSON: no se pueden leer con `response.json()` porque daría error. Se usan poniendo su URL en el atributo `src` de un `<img>` (o con `response.blob()`). Por eso con CATAAS primero pido el JSON (`?json=true`) para obtener el `id`, y después le doy a la etiqueta `<img>` la URL `https://cataas.com/cat/{id}`, que sí devuelve la imagen. Dog CEO funciona parecido: devuelve un JSON cuyo campo `message` contiene la URL de la imagen.

**3. ¿Qué función cumplen `await` y `response.json()`?**
`fetch` es asíncrono: devuelve una promesa que se resuelve cuando llega la respuesta. `await` pausa la ejecución de la función `async` hasta que esa promesa termina y entrega su resultado, sin congelar la página, así el código se lee de arriba abajo en lugar de anidar `.then()`. `response.json()` lee el cuerpo de la respuesta y lo convierte de texto JSON a un objeto de JavaScript; también devuelve una promesa, por eso se usa con `await`.

**4. ¿Por qué se debe verificar `response.ok` además de utilizar `try/catch`?**
Porque `fetch` solo rechaza la promesa cuando hay un fallo de red (sin conexión, DNS, etc.). Si el servidor responde con un error HTTP como 404 o 500, `fetch` lo considera una respuesta normal y no lanza ninguna excepción, así que el `catch` no se ejecutaría. `response.ok` es `true` únicamente con códigos 200–299; al revisarlo puedo lanzar mi propio error y mostrar el mensaje correcto. El `try/catch` sigue siendo necesario para capturar los fallos de red, el JSON inválido o el tiempo agotado.

**5. ¿Cómo lograste actualizar una sección sin recargar toda la página?**
Los botones son `type="button"` (no envían formularios ni cambian de URL). Al hacer clic, un `addEventListener` llama a `actualizarSeccion()` de esa tarjeta, que consulta la API con `fetch` y modifica solo los elementos de esa tarjeta en el DOM (`textContent`, `src`, `alt` y mostrar u ocultar los estados “cargando”, “error” y “contenido”). El navegador nunca navega a otra página, por lo que el resto de la interfaz no se toca. Cada sección tiene su propio estado, así que pueden actualizarse de forma independiente.
