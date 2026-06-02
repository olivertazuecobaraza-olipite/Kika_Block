# KIKA_CHAT para Moodle

Bloque de Moodle que integra un chat asistente con `KIKA_API`. El plugin muestra una interfaz de chat dentro del curso, permite mantener conversaciones por usuario y curso, y envia las peticiones al backend mediante endpoints PHP del servidor Moodle.

La licencia JWT de `KIKA_API` se configura desde la administracion global de Moodle o desde el entorno del servidor y nunca se expone al navegador.

## Caracteristicas

- Chat embebido como bloque de Moodle.
- Integracion server-side con `KIKA_API`.
- Gestion de conversaciones por curso, usuario e instancia de bloque.
- Persistencia opcional de la conversacion activa en el navegador.
- Selector/listado de conversaciones.
- Acciones rapidas para crear examen, resumen, esquema o idea.
- Configuracion global del asistente desde administracion del sitio.
- Configuracion por instancia de bloque para `vs_id_QDRANT` y codigo de curso.
- Registro opcional de mensajes y respuestas en Moodle.
- Informe de logs para administradores.

## Requisitos

- Moodle `4.0` o superior.
- PHP compatible con la version de Moodle instalada.
- Servicio `KIKA_API` accesible desde el servidor Moodle.
- Una licencia JWT valida de `KIKA_API`.
- Un identificador de vector store de Qdrant para cada instancia del bloque.

## Instalacion

1. Copia la carpeta del plugin en:

   ```text
   moodle/blocks/kika_chat
   ```

2. Accede a Moodle como administrador.

3. Ve a:

   ```text
   Administracion del sitio > Notificaciones
   ```

4. Ejecuta la instalacion o actualizacion del plugin cuando Moodle lo solicite.

5. Configura la URL y el JWT desde los ajustes globales del bloque.

## Configuracion global

Desde `Administracion del sitio > Extensiones > Bloques > KIKA_CHAT Block`, configura:

- `KIKA_API URL`: URL base completa, por ejemplo `https://api.example.com/api/tutor`.
- `KIKA_API JWT token`: JWT comercial usado por Moodle.
- `KIKA_API license configured`: indica `yes` o `no`, sin mostrar el JWT.
- `Assistant name`: nombre mostrado para el asistente. Por defecto, `Kika`.
- `User name`: etiqueta mostrada para el usuario.
- `Enable logging`: guarda mensajes y respuestas en la tabla de logs del plugin.
- `Instance-level settings`: permite sobrescribir etiquetas desde cada instancia del bloque.

Como alternativa avanzada, se aceptan variables de entorno o constantes definidas en `config.php`:

```env
KIKA_API_URL=https://api.example.com/api/tutor
KIKA_API_TOKEN=<jwt_comercial>
```

Estas tienen prioridad sobre los valores editables. Para instalaciones con requisitos de seguridad estrictos, usa esta alternativa: los valores editables se guardan en la configuracion global de Moodle. Nunca guardes el JWT en JavaScript, HTML, logs ni Git.

## Configuracion del bloque en un curso

Al agregar el bloque a un curso, cada instancia debe definir:

- `Block title`: titulo visible del bloque.
- `Qdrant vector store ID`: valor enviado a `KIKA_API` como `vs_id_QDRANT`.
- `Course code for KIKA_API`: valor enviado como `curso`. Si se deja vacio, se usa el `shortname` del curso Moodle.
- `Persist conversation`: mantiene la conversacion activa entre recargas de pagina.
- `User name` y `Assistant name`: disponibles si estan permitidos desde la configuracion global.

Los identificadores enviados a `KIKA_API` deben contener solo letras, numeros, guiones bajos y guiones.

## Datos enviados a KIKA_API

El plugin deriva y envia los siguientes datos:

- `course_id`: ID del curso Moodle como texto.
- `curso`: codigo configurado en la instancia o `shortname` del curso.
- `vs_id_QDRANT`: identificador Qdrant configurado en la instancia.
- `instructions`: instrucciones del tutor con el curso interpolado y el marcador `{context}` para que `KIKA_API` inserte el contexto oficial recuperado.
- `x-user-id`: ID numerico estable de Moodle, con formato `(string) $USER->id`.
- `Authorization: Bearer <jwt>`: licencia leida exclusivamente en el servidor.

## Flujo de conversaciones

El navegador llama a endpoints locales del plugin:

- `api/completion.php`: crea una conversacion si es necesario y envia el mensaje del usuario.
- `api/conversations.php`: lista o crea conversaciones del curso actual.
- `api/conversation_messages.php`: carga los mensajes de una conversacion.
- `api/conversation.php`: renombra o elimina una conversacion.

Estos endpoints validan sesion, curso, contexto y `sesskey`, y actuan como proxy hacia `KIKA_API`. Suponiendo que `KIKA_API_URL` termina en `/api/tutor`, llaman a:

- `POST /api/tutor/conversations`
- `GET /api/tutor/conversations?course_id=...`
- `POST /api/tutor/conversations/:conversationId/messages`
- `GET /api/tutor/conversations/:conversationId/messages`
- `PATCH /api/tutor/conversations/:conversationId`
- `DELETE /api/tutor/conversations/:conversationId`

## Logs

Si el logging esta activado, el plugin guarda pares de mensaje/respuesta en la tabla:

```text
block_kika_chat_log
```

Los administradores pueden consultar los registros desde el informe incluido en el plugin.

## Desarrollo

El codigo JavaScript fuente esta en:

```text
amd/src/lib.js
```

El modulo compilado usado por Moodle esta en:

```text
amd/build/lib.min.js
```

Despues de modificar `amd/src/lib.js`, recompila los assets AMD con el flujo habitual de Moodle/Grunt del proyecto antes de desplegar.

## Estructura principal

```text
kika_chat/
|-- amd/                 # JavaScript AMD del bloque
|-- api/                 # Endpoints PHP proxy hacia KIKA_API
|-- classes/             # Clases PHP del plugin
|-- db/                  # Instalacion, permisos y upgrades
|-- lang/                # Cadenas de idioma
|-- pix/                 # Iconos
|-- templates/           # Plantillas Mustache
|-- block_kika_chat.php  # Clase principal del bloque
|-- edit_form.php        # Formulario de configuracion por instancia
|-- settings.php         # Configuracion global
|-- report.php           # Informe administrativo de logs
`-- version.php          # Version y requisitos del plugin
```

## Seguridad

- El JWT de `KIKA_API` no se envia al cliente.
- Las peticiones externas salen desde PHP en el servidor Moodle.
- El bloque valida configuracion obligatoria antes de habilitar el chat.
- El uso del chat requiere un usuario autenticado con acceso al curso.
- Solo gestores con `block/kika_chat:configure` pueden cambiar `curso` y `vs_id_QDRANT`.
- El HTML remoto se sanea en PHP antes de insertarlo en el chat.
- Las fuentes web aceptan unicamente enlaces `http://` y `https://`.

## Renovacion de licencia

1. Emite el JWT nuevo y revoca o sustituye el anterior.
2. Actualiza `KIKA_API JWT token` desde los ajustes globales del bloque.
3. Guarda los cambios.
4. Verifica que crear, enviar, listar, abrir, renombrar y borrar conversaciones sigue funcionando.

No es necesario modificar ajustes visuales ni instancias del bloque.

## Auditoria de integracion

Flujo actual:

```text
Navegador -> endpoints PHP locales de Moodle -> KIKA_API -> MongoDB
```

- El navegador no recibe el JWT, la cabecera `Authorization` ni `KIKA_API_URL`.
- No existe llamada directa desde JavaScript a `KIKA_API`.
- Se usan conversaciones con memoria para crear, listar, abrir historial, enviar, renombrar y borrar.
- No existe flujo legacy `/ask`.
- `curso`, ID de curso y `vs_id_QDRANT` se derivan en PHP desde la instancia del bloque y el curso Moodle.

## Licencia

Este plugin se distribuye bajo licencia MIT. Consulta el archivo `LICENSE`.
