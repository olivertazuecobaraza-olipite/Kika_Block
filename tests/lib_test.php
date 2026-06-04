<?php
/**
 * Tests for KIKA_CHAT helpers.
 *
 * @package block_kika_chat
 */

namespace block_kika_chat;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../lib.php');

class lib_test extends \advanced_testcase {
    public function test_user_api_id_is_numeric_moodle_id(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->assertSame((string)$user->id, kika_get_user_api_id());
    }

    public function test_sources_only_keep_http_urls(): void {
        $sources = kika_sanitise_sources([
            ['url' => 'https://example.com/page', 'title' => 'Example'],
            ['url' => 'javascript:alert(1)', 'title' => 'Unsafe'],
        ]);

        $this->assertCount(1, $sources);
        $this->assertSame('https://example.com/page', $sources[0]['url']);
        $this->assertSame('Example', $sources[0]['title']);
    }

    public function test_remote_html_is_sanitised(): void {
        $clean = kika_sanitise_remote_html(
            '<p>Allowed</p><script>alert(1)</script>',
            \context_system::instance()
        );

        $this->assertStringContainsString('<p>Allowed</p>', $clean);
        $this->assertStringNotContainsString('<script', $clean);
    }

    public function test_remote_answer_accepts_backend_field_variants(): void {
        $this->assertSame('Primary', kika_get_remote_answer(['respuesta' => 'Primary']));
        $this->assertSame('Message', kika_get_remote_answer(['message' => 'Message']));
        $this->assertSame('Content', kika_get_remote_answer(['content' => 'Content']));
        $this->assertSame('Answer', kika_get_remote_answer(['answer' => 'Answer']));
        $this->assertSame('', kika_get_remote_answer(['respuesta' => '   ']));
    }

    public function test_remote_error_detail_accepts_backend_error_fields(): void {
        $this->assertSame('Unauthorized', kika_get_remote_error_detail(['detail' => 'Unauthorized']));
        $this->assertSame('Invalid token', kika_get_remote_error_detail(['error' => 'Invalid token']));
        $this->assertSame('', kika_get_remote_error_detail(['error' => '   ']));
    }

    public function test_remote_message_accepts_content_fallbacks_and_fuentes(): void {
        $message = kika_normalise_remote_message([
            'role' => 'assistant',
            'respuesta' => '<p>Respuesta</p>',
            'fuentes' => [
                ['url' => 'https://example.com/source', 'title' => 'Source'],
            ],
        ], \context_system::instance());

        $this->assertSame('assistant', $message['role']);
        $this->assertStringContainsString('<p>Respuesta</p>', $message['message']);
        $this->assertTrue($message['web_search_used']);
        $this->assertCount(1, $message['sources']);
        $this->assertSame('https://example.com/source', $message['sources'][0]['url']);
    }

    public function test_remote_user_message_is_escaped(): void {
        $message = kika_normalise_remote_message([
            'role' => 'user',
            'message' => '<strong>Unsafe</strong>',
        ], \context_system::instance());

        $this->assertSame('user', $message['role']);
        $this->assertSame('&lt;strong&gt;Unsafe&lt;/strong&gt;', $message['message']);
    }

    public function test_api_base_url_accepts_https_and_localhost_only(): void {
        $this->resetAfterTest();

        set_config('kika_api_url', 'https://api.example.com/api/tutor/', 'block_kika_chat');
        $this->assertSame('https://api.example.com/api/tutor', kika_get_api_base_url());

        set_config('kika_api_url', 'http://localhost:3000/api/tutor', 'block_kika_chat');
        $this->assertSame('http://localhost:3000/api/tutor', kika_get_api_base_url());

        set_config('kika_api_url', 'http://api.example.com/api/tutor', 'block_kika_chat');
        $this->expectException(\moodle_exception::class);
        kika_get_api_base_url();
    }
}
