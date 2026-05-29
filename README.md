# KIKA_CHAT Moodle Block

This block connects Moodle to KIKA_API through server-side PHP proxy endpoints. The browser never receives the KIKA_API key.

## Required Site Settings

Configure these values in Moodle site administration for the block:

- `KIKA_API base URL`: for example `http://localhost:3000`.
- `KIKA_API key`: the same value configured as `API_KEY` in KIKA_API.
- `Restrict usage to logged-in users`: recommended enabled.
- `Assistant name`, `User name`, and `Enable logging` as needed.

## Required Block Instance Settings

Each course block instance must define:

- `Qdrant vector store ID`: sent to KIKA_API as `vs_id_QDRANT`.
- `Course code for KIKA_API`: optional. If empty, Moodle uses the course shortname.
- `Persist conversation`: stores the active `conversation_id` in browser localStorage per user, course and block.

KIKA_API receives:

- `course id`: Moodle course ID as a string.
- `curso`: instance course code or Moodle course shortname.
- `vs_id_QDRANT`: instance vector store ID.
- `x-user-id`: `moodle_{USER->id}`.

All of these identifiers must contain only letters, numbers, underscores and hyphens.

## Conversation Flow

The frontend calls local endpoints under `/blocks/kika_chat/api/`:

- `completion.php`: creates a conversation if needed and sends the user message.
- `conversations.php`: lists or creates conversations for the current course.
- `conversation_messages.php`: loads messages for one conversation.
- `conversation.php`: renames or deletes a conversation.

Those PHP endpoints call KIKA_API:

- `POST /api/tutor/conversations`
- `GET /api/tutor/conversations?course_id=...`
- `POST /api/tutor/conversations/:conversationId/messages`
- `GET /api/tutor/conversations/:conversationId/messages`
- `PATCH /api/tutor/conversations/:conversationId`
- `DELETE /api/tutor/conversations/:conversationId`

## Local Build

After editing `amd/src/lib.js`, rebuild Moodle AMD assets using the project's Moodle/Grunt workflow, or copy the generated AMD module into `amd/build/lib.min.js` during development.

## Local Logs

If block logging is enabled, successful message/response pairs are still written to Moodle's `block_kika_chat_log` table and can be viewed through the existing reports.
