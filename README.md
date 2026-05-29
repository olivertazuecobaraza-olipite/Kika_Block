# KIKA_CHAT para Moodle

Bloque de Moodle que integra un chat asistente con `KIKA_API`. El plugin muestra una interfaz de chat dentro del curso, permite mantener conversaciones por usuario y curso, y envia las peticiones al backend mediante endpoints PHP del servidor Moodle.

La clave de `KIKA_API` se guarda en la configuracion del sitio y nunca se expone al navegador.

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
- Una clave valida de `KIKA_API`.
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

5. Configura los ajustes globales del bloque.

## Configuracion global

Desde la administracion del sitio, configura el bloque `KIKA_CHAT`:

- `KIKA_API base URL`: URL base del servicio, por ejemplo `http://localhost:3000`.
- `KIKA_API key`: clave privada usada por Moodle para llamar a `KIKA_API`.
- `Restrict usage to logged-in users`: recomendado activado.
- `Assistant name`: nombre mostrado para el asistente. Por defecto, `Kika`.
- `User name`: etiqueta mostrada para el usuario.
- `Enable logging`: guarda mensajes y respuestas en la tabla de logs del plugin.
- `Instance-level settings`: permite sobrescribir etiquetas desde cada instancia del bloque.

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
- `x-user-id`: identificador del usuario con formato `moodle_{USER->id}`.
- `x-api-key`: clave configurada en Moodle. Solo se envia desde PHP.

## Flujo de conversaciones

El navegador llama a endpoints locales del plugin:

- `api/completion.php`: crea una conversacion si es necesario y envia el mensaje del usuario.
- `api/conversations.php`: lista o crea conversaciones del curso actual.
- `api/conversation_messages.php`: carga los mensajes de una conversacion.
- `api/conversation.php`: renombra o elimina una conversacion.

Estos endpoints actuan como proxy hacia `KIKA_API`:

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

- La clave de `KIKA_API` no se envia al cliente.
- Las peticiones externas salen desde PHP en el servidor Moodle.
- El bloque valida configuracion obligatoria antes de habilitar el chat.
- Se recomienda restringir el uso a usuarios autenticados.

## Licencia

Este plugin se distribuye bajo licencia GNU GPL v3 o posterior. Consulta el archivo `LICENSE`.
