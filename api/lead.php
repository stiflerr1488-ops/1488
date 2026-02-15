<?php
/**
 * NP.Maps — lead endpoint (recommended)
 *
 * ✅ Reliable delivery options:
 * 1) Telegram Bot (best on most hostings): set tg_bot_token + tg_chat_id in api/config.php
 * 2) Email (fallback): set to_email in api/config.php (uses PHP mail(); may be blocked on some hostings)
 *
 * Client sends JSON (Content-Type: application/json).
 * Response:
 *  - 200 {"ok":true,"channels":{...},"logged":true/false}
 *  - 503 {"ok":false,"error":"not_configured"} when no delivery channel is configured
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');

function cfg($key, $default = '') {
  // 1) api/config.php
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

  // 2) env vars (optional)
  $envKey = 'NP_' . strtoupper($key);
  $v = getenv($envKey);
  if ($v !== false && $v !== null && $v !== '') return $v;

  return $default;
}

$TO = trim((string)cfg('to_email', ''));
$SUBJECT = trim((string)cfg('subject', 'NP.Maps — новая заявка (сайт)'));
$LOG_FILE = (string)cfg('log_file', __DIR__ . '/leads.jsonl');

$TG_TOKEN = trim((string)cfg('tg_bot_token', ''));
$TG_CHAT  = trim((string)cfg('tg_chat_id', ''));

$hasEmail = ($TO !== '' && strpos($TO, '@') !== false);
$hasTg    = ($TG_TOKEN !== '' && $TG_CHAT !== '');

// Guard: do not accept leads until at least one channel is configured
if (!$hasEmail && !$hasTg) {
  http_response_code(503);
  echo json_encode(["ok" => false, "error" => "not_configured"]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "method_not_allowed"]);
  exit;
}

$raw = file_get_contents('php://input');
if (!$raw) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "empty_body"]);
  exit;
}

$data = json_decode($raw, true);
if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "invalid_json"]);
  exit;
}


// Anti-spam (lightweight): rate limit + honeypot
$ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : 'unknown';
$now = time();

// 1) Per-IP rate limit (file based)
// Tune if needed: 12 requests/hour per IP
$RL_FILE = __DIR__ . '/ratelimit.json';
$RL_WINDOW = 3600;
$RL_MAX = 12;

try {
  $state = [];
  if (is_file($RL_FILE)) {
    $rawState = @file_get_contents($RL_FILE);
    $decoded = json_decode($rawState, true);
    if (is_array($decoded)) $state = $decoded;
  }
  $bucket = isset($state[$ip]) && is_array($state[$ip]) ? $state[$ip] : [];
  $bucket = array_values(array_filter($bucket, function($t) use ($now, $RL_WINDOW) {
    return is_numeric($t) && ($now - (int)$t) < $RL_WINDOW;
  }));
  if (count($bucket) >= $RL_MAX) {
    http_response_code(429);
    echo json_encode(["ok" => false, "error" => "rate_limited"]);
    exit;
  }
  $bucket[] = $now;
  $state[$ip] = $bucket;
  @file_put_contents($RL_FILE, json_encode($state), LOCK_EX);
} catch (Throwable $e) {
  // If RL fails, do not block real leads
}

// 2) Honeypot: if filled, silently accept but do not deliver
$hp = isset($data['_hp']) ? trim((string)$data['_hp']) : '';
$isSpam = ($hp !== '');


// Minimal required field
$card = isset($data['card']) ? trim((string)$data['card']) : '';
if ($card === '') {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "missing_card"]);
  exit;
}

// Build a readable message
$lines = [];
$lines[] = "Новая заявка с сайта NP.Maps";
$lines[] = "--------------------------";

$map = [
  'card' => 'Карточка/название',
  'name' => 'Имя',
  'contact' => 'Контакт',
  'city' => 'Город/район',
  'points' => 'Точек',
  'comment' => 'Комментарий',
  'goal' => 'Цель',
  'pain' => 'Задача',
  'recommendation' => 'Рекомендация',
  'topic' => 'Тема',
  'from' => 'Раздел',
  'placement' => 'Источник',
  'ab_hero' => 'Вариант hero CTA',
  'page' => 'Страница',
  'ts' => 'Время (ISO)',
];

foreach ($map as $k => $label) {
  if (!array_key_exists($k, $data)) continue;
  $v = trim((string)$data[$k]);
  if ($v === '') $v = '—';
  $lines[] = $label . ": " . $v;
}

// UTM block
if (isset($data['utm']) && is_array($data['utm']) && count($data['utm'])) {
  $pairs = [];
  foreach ($data['utm'] as $k => $v) {
    $k = trim((string)$k);
    $v = trim((string)$v);
    if ($k === '' || $v === '') continue;
    $pairs[] = $k . '=' . $v;
  }
  if (count($pairs)) $lines[] = "UTM: " . implode('; ', $pairs);
}

// Optional message
if (isset($data['message'])) {
  $msg = trim((string)$data['message']);
  if ($msg !== '') {
    $lines[] = "";
    $lines[] = "Сообщение:";
    $lines[] = $msg;
  }
}

$body = implode("\n", $lines);

// Optional logging (recommended)
$logged = false;
if ($LOG_FILE) {
  $row = [
    'received_at' => gmdate('c'),
    'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '',
    'ua' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '',
    'data' => $data,
  ];
  $logged = @file_put_contents($LOG_FILE, json_encode($row, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX) !== false;
}

// Delivery
$channels = ['email' => false, 'telegram' => false];

// If spam detected via honeypot — do not deliver
if ($isSpam) {
  http_response_code(200);
  echo json_encode(["ok" => true, "channels" => $channels, "logged" => $logged]);
  exit;
}


// 1) Telegram Bot delivery (most reliable)
if ($hasTg) {
  $text = $body;
  // Telegram message length limit is ~4096; truncate safely
  if (mb_strlen($text, 'UTF-8') > 3900) {
    $text = mb_substr($text, 0, 3900, 'UTF-8') . "\n…(обрезано)";
  }

  $url = "https://api.telegram.org/bot" . urlencode($TG_TOKEN) . "/sendMessage";
  $payload = http_build_query([
    'chat_id' => $TG_CHAT,
    'text' => $text,
    'disable_web_page_preview' => true,
  ]);

  $ok = false;

  // Prefer cURL if available
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp && $code >= 200 && $code < 300) {
      $ok = true;
    }
  } else {
    // Fallback to file_get_contents
    $ctx = stream_context_create([
      'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $payload,
        'timeout' => 8,
      ]
    ]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp !== false) $ok = true;
  }

  $channels['telegram'] = $ok;
}

// 2) Email delivery (fallback, depends on hosting)
if ($hasEmail) {
  $headers = "Content-Type: text/plain; charset=UTF-8\r\n";
  $channels['email'] = @mail($TO, $SUBJECT, $body, $headers) ? true : false;
}

$deliveredAny = ($channels['telegram'] || $channels['email']);

if (!$deliveredAny) {
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => "delivery_failed", "channels" => $channels, "logged" => $logged]);
  exit;
}

echo json_encode(["ok" => true, "channels" => $channels, "logged" => $logged]);
