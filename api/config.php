<?php
/**
 * NP.Maps — lead endpoint config (LIVE)
 *
 * IMPORTANT:
 * - Keep this file server-side only. Do NOT publish the token.
 * - If you ever shared the token anywhere, revoke it in @BotFather and replace here.
 *
 * How to set tg_chat_id:
 * - For a private channel with @username: set tg_chat_id to '@your_channel_username'
 * - For a personal chat / group: set tg_chat_id to numeric id (e.g. 123456789 or -100123...)
 */
return [
  // Email delivery (optional)
  'to_email' => '',

  // Telegram Bot delivery (recommended)
  // TIP: safer to set NP_TG_BOT_TOKEN and NP_TG_CHAT_ID as environment variables on the server.
  'tg_bot_token' => '',
  'tg_chat_id' => '', // <-- CHANGE THIS to your real destination

  // Common
  'subject' => 'NP.Maps — новая заявка (сайт)',

  // Logging (recommended)
  'log_file' => __DIR__ . '/leads.jsonl', // set '' to disable
];
