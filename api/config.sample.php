<?php
/**
 * NP.Maps — lead endpoint config (sample)
 *
 * Create api/config.php (copy this file) and fill values.
 * You can configure either:
 *  - Email delivery: set to_email
 *  - Telegram delivery: set tg_bot_token + tg_chat_id
 *
 * Tip: Telegram is the most reliable delivery channel on cheap hostings.
 */
return [
  // Email delivery (optional)
  'to_email' => '',

  // Telegram Bot delivery (optional)
  'tg_bot_token' => '', // e.g. 123456:ABC-DEF...
  'tg_chat_id' => '',   // e.g. 123456789 or -1001234567890 (channels)

  // Common
  'subject' => 'NP.Maps — новая заявка (сайт)',

  // Logging (recommended)
  'log_file' => __DIR__ . '/leads.jsonl', // set '' to disable
];
