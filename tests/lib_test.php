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
}
