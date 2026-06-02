
<?php
// Incluye la configuración de Moodle.
require_once('../../config.php');

// Asegúrate de que el usuario está logueado.
require_login();

// Obtén el ID del usuario actual.
global $DB, $USER, $OUTPUT, $PAGE;

// Configuración de la página.
$PAGE->set_url(new moodle_url('/blocks/kika_chat/view_user_logs.php'));
$PAGE->set_context(context_system::instance());
$PAGE->set_title(get_string('yourconversations', 'block_kika_chat'));
$PAGE->set_heading(get_string('yourconversations', 'block_kika_chat'));

// Consulta los registros de conversación del usuario.
$records = $DB->get_records('block_kika_chat_log', ['userid' => $USER->id], 'timecreated DESC');

// Muestra la cabecera de la página.
echo $OUTPUT->header();
echo '<h2>' . get_string('yourconversations', 'block_kika_chat') . '</h2>';

// Estilo adicional para mejorar el diseño.
echo '<style>
.generaltable {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 14px;
}
.generaltable th, .generaltable td {
    border: 1px solid #ddd;
    padding: 8px;
}
.generaltable th {
    background-color: #f2f2f2;
    text-align: left;
}
</style>';

// Comprueba si hay registros.
if ($records) {
    echo '<table class="generaltable">';
    echo '<tr>';
    echo '<th>' . get_string('date', 'block_kika_chat') . '</th>';
    echo '<th>' . get_string('user_message', 'block_kika_chat') . '</th>';
    echo '<th>' . get_string('ai_response', 'block_kika_chat') . '</th>';
    echo '</tr>';

    foreach ($records as $record) {
        echo '<tr>';
        echo '<td>' . userdate($record->timecreated) . '</td>';
        echo '<td>' . s($record->usermessage) . '</td>';
        echo '<td>' . clean_text($record->airesponse, FORMAT_HTML) . '</td>';
        echo '</tr>';
    }

    echo '</table>';
} else {
    // Mensaje si no hay registros.
    echo '<p>' . get_string('noconversations', 'block_kika_chat') . '</p>';
}

// Muestra el pie de página.
echo $OUTPUT->footer();
?>
