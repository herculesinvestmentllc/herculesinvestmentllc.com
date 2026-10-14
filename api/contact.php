<?php
declare(strict_types=1);

/**
 * Hercules Investments LLC — iletisim formu endpoint'i
 * Konum: public_html/api/contact.php
 *
 * Mantik: mesaj ONCE veritabanina yazilir, SONRA mail denenir.
 * Mail gitmese bile mesaj kaybolmaz — phpMyAdmin'den her zaman gorursun.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// --- config yukle ---
// Once public_html DISINDAKI kopya denenir (/home/KULLANICI/private/config.php);
// api/ icindeki kopya sadece gecis donemi icin.
$configPath = dirname(__DIR__, 2) . '/private/config.php';
if (!is_file($configPath)) {
    $configPath = __DIR__ . '/config.php';
}
if (!is_file($configPath)) {
    // Ayrinti sadece sunucu loguna; disariya genel hata.
    error_log('[hercules-contact] config.php bulunamadi');
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server']);
    exit;
}
$cfg = require $configPath;

// --- CORS / method ---
if (!empty($cfg['allowed_origin'])) {
    header('Access-Control-Allow-Origin: ' . $cfg['allowed_origin']);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// --- girdiyi al (JSON veya form-encoded) ---
$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in)) { $in = $_POST; }

function val(array $a, string $k, int $max = 500): string {
    $v = isset($a[$k]) ? (string)$a[$k] : '';
    $v = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v));
    return mb_substr($v, 0, $max);
}

// --- SPAM: honeypot (bot'lar gizli alani doldurur, insan gormez) ---
if (val($in, 'website', 200) !== '') {
    echo json_encode(['ok' => true]);  // bot'a basarili de, hicbir sey yapma
    exit;
}

// Not: "formu 2 saniyeden hizli doldurduysan bot'sun" kontrolu kaldirildi.
// Gonderim suresi istemciden gelir, bot onu istedigi gibi ayarlayabilir; bu yuzden
// gercek bir botu durdurmuyordu. Buna karsilik otomatik doldurma + hizli gonderim
// yapan gercek kullanicilarda mesaji kaydetmeden yutuyordu (kullanici basarili
// gorurken hicbir kayit olusmuyordu). Kalan savunmalar: honeypot, IP throttle ve
// saatlik genel sinir.

$name     = val($in, 'name', 120);
$email    = val($in, 'email', 190);
$company  = val($in, 'company', 160);
$interest = val($in, 'interest', 120);
$message  = val($in, 'message', 5000);
$lang     = val($in, 'lang', 5);

// --- dogrulama ---
$errors = [];
if ($name === '')                                    { $errors[] = 'name'; }
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'email'; }
if (mb_strlen($message) < 5)                         { $errors[] = 'message'; }

if ($errors) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation', 'fields' => $errors]);
    exit;
}

// Sadece REMOTE_ADDR: site Cloudflare arkasinda degil, CF-Connecting-IP /
// X-Forwarded-For gibi basliklari istemci istedigi gibi yazabilir ve
// throttle'i her istekte farkli sahte IP ile atlatir.
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);

// --- veritabani ---
try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $cfg['db_host'], $cfg['db_name']),
        $cfg['db_user'],
        $cfg['db_pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (Throwable $e) {
    error_log('[hercules-contact] db connect: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server']);
    exit;
}

// --- throttle: ayni IP cok sik gondermesin ---
$throttle = (int)($cfg['throttle_seconds'] ?? 30);
if ($throttle > 0 && $ip !== '') {
    $st = $pdo->prepare(
        'SELECT COUNT(*) AS n FROM contact_messages
          WHERE ip = ? AND created_at > (NOW() - INTERVAL ? SECOND)'
    );
    $st->execute([$ip, $throttle]);
    if ((int)$st->fetch()['n'] > 0) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'too_many_requests']);
        exit;
    }
}

// --- genel sinir: IP'den bagimsiz, saatte en fazla N mesaj ---
// IP basina throttle dagitik bir botu durdurmaz; bu sinir veritabanini ve
// bildirim kutusunu korur. Asilirsa yeni mesaj reddedilir (429).
$hourlyLimit = (int)($cfg['hourly_limit'] ?? 20);
if ($hourlyLimit > 0) {
    $st = $pdo->query(
        'SELECT COUNT(*) AS n FROM contact_messages
          WHERE created_at > (NOW() - INTERVAL 1 HOUR)'
    );
    if ((int)$st->fetch()['n'] >= $hourlyLimit) {
        error_log('[hercules-contact] saatlik genel sinir asildi');
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'too_many_requests']);
        exit;
    }
}

// --- kaydet ---
try {
    $st = $pdo->prepare(
        'INSERT INTO contact_messages
            (created_at, name, email, company, interest, message, lang, ip, user_agent, mail_sent)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 0)'
    );
    $st->execute([$name, $email, $company, $interest, $message, $lang, $ip, $ua]);
    $id = (int)$pdo->lastInsertId();
} catch (Throwable $e) {
    error_log('[hercules-contact] insert: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server']);
    exit;
}

// --- bildirim maili (basarisiz olsa da kayit duruyor) ---
$sent = false;
try {
    $to      = implode(', ', (array)$cfg['notify_to']);
    $subject = sprintf('[Web] %s — %s', $interest !== '' ? $interest : 'Contact', $name);

    $body = "Yeni form mesaji #{$id}\n"
          . str_repeat('-', 40) . "\n"
          . "Ad Soyad : {$name}\n"
          . "E-posta  : {$email}\n"
          . "Sirket   : " . ($company !== '' ? $company : '-') . "\n"
          . "Konu     : " . ($interest !== '' ? $interest : '-') . "\n"
          . "Dil      : " . ($lang !== '' ? $lang : '-') . "\n"
          . "IP       : {$ip}\n"
          . str_repeat('-', 40) . "\n\n"
          . $message . "\n";

    // From KENDI alan adinda olmali; Reply-To kullaniciya gider ki dogrudan yanitlayabilesin.
    $headers = [
        'From: ' . sprintf('=?UTF-8?B?%s?= <%s>', base64_encode((string)$cfg['mail_from_name']), $cfg['mail_from']),
        'Reply-To: ' . $email,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'MIME-Version: 1.0',
        'X-Mailer: hercules-contact',
    ];

    $sent = mail(
        $to,
        '=?UTF-8?B?' . base64_encode($subject) . '?=',
        $body,
        implode("\r\n", $headers),
        '-f' . $cfg['mail_from']   // envelope sender — SPF icin onemli
    );

    if ($sent) {
        $pdo->prepare('UPDATE contact_messages SET mail_sent = 1 WHERE id = ?')->execute([$id]);
    }
} catch (Throwable $e) {
    error_log('[hercules-contact] mail: ' . $e->getMessage());
}

// id ve mail durumu disariya verilmez: sirali id gelen mesaj sayisini ele verir.
echo json_encode(['ok' => true]);
