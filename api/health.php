<?php
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');

function cfg($key, $default = '') {
  static $C = null;
  if ($C === null) {
    $C = [];
    $p = __DIR__ . '/config.php';
    if (file_exists($p)) {
      $tmp = include $p;
      if (is_array($tmp)) $C = $tmp;
    }
  }
  if (array_key_exists($key, $C)) return $C[$key];

  $envKey = 'NP_' . strtoupper($key);
  $v = getenv($envKey);
  if ($v !== false && $v !== null && $v !== '') return $v;

  return $default;
}

$to = trim((string)cfg('to_email', ''));
$tgToken = trim((string)cfg('tg_bot_token', ''));
$tgChat = trim((string)cfg('tg_chat_id', ''));
$logFile = (string)cfg('log_file', __DIR__ . '/leads.jsonl');

$hasEmail = ($to !== '' && strpos($to, '@') !== false);
$hasTg = ($tgToken !== '' && $tgChat !== '');
$hasChannel = $hasEmail || $hasTg;

$logDir = dirname($logFile);
$logDirExists = is_dir($logDir);
$logWritable = $logDirExists && is_writable($logDir);

$status = ($hasChannel && $logWritable) ? 'ok' : 'degraded';
http_response_code($status === 'ok' ? 200 : 503);

echo json_encode([
  'ok' => $status === 'ok',
  'status' => $status,
  'channels' => [
    'email' => $hasEmail,
    'telegram' => $hasTg,
  ],
  'log' => [
    'path' => $logFile,
    'dir_exists' => $logDirExists,
    'dir_writable' => $logWritable,
  ],
]);
