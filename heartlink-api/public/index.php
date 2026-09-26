<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BOOT: /api/v1/user-count — raw DB query, no Laravel needed
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    // Match /api/v1/user-count with optional query string
    if (!preg_match('#/api/v1/user-count(\?.*)?$#', $uri)) {
        return; // not our route, continue to Laravel
    }

    $host   = '127.0.0.1';
    $port   = 3306;
    $dbName = 'u773098752_heartlink';
    $dbUser = 'u773098752_heartlink';
    $dbPass = 'V&g4XOsIc>f3';

    try {
        $pdo = new PDO(
            "mysql:host=$host;port=$port;dbname=$dbName;charset=utf8mb4",
            $dbUser,
            $dbPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
        );

        $userId     = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 16;
        $totalCount = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

        $stmt = $pdo->prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        echo json_encode([
            'success'     => true,
            'total_users' => $totalCount,
            'user'        => $user,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
})();
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MANDATORY APP VERSION GATE
// Intercept outdated clients before Laravel even boots.
// Send header:  X-App-Version-Code: <number>
// or param:     ?version_code=<number>
// If version < 60, the request is rejected immediately.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    $requiredVersionCode = 60;
    $playStoreUrl        = 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';
    $marketUrl           = 'market://details?id=com.heartlinkdatingapp.app';

    // Read version from header (preferred) or query/body param
    $clientVersionCode = 0;
    if (isset($_SERVER['HTTP_X_APP_VERSION_CODE'])) {
        $clientVersionCode = (int) $_SERVER['HTTP_X_APP_VERSION_CODE'];
    } elseif (isset($_REQUEST['version_code'])) {
        $clientVersionCode = (int) $_REQUEST['version_code'];
    }

    // Only gate requests that actually send a version code
    if ($clientVersionCode > 0 && $clientVersionCode < $requiredVersionCode) {
        $isJsonRequest = (
            (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json')) ||
            (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') ||
            (isset($_SERVER['REQUEST_URI']) && str_contains($_SERVER['REQUEST_URI'], '/api/'))
        );

        $title       = '✨ Update HeartLink';
        $message     = 'A new version of HeartLink is available. Please update to continue finding your perfect match.';
        $releaseNotes = [
            '⚡ Faster real-time messaging & instant chat',
            '🔒 Enhanced account safety & verification',
            '✨ Smoother swiping and vibe matchmaking',
            '🛡️ New Block & Report safety controls',
            '🛠️ Critical performance & stability fixes',
        ];

        if ($isJsonRequest) {
            // ── JSON response for mobile app / API clients ──
            http_response_code(200);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Force-Update: true');
            echo json_encode([
                'success'              => true,
                'force_update'         => true,
                'update_required'      => true,
                'update_available'     => true,
                'client_version_code'  => $clientVersionCode,
                'min_version_code'     => $requiredVersionCode,
                'latest_version_code'  => $requiredVersionCode,
                'latest_version_name'  => '1.0.60',
                'title'                => $title,
                'message'              => $message,
                'release_notes'        => $releaseNotes,
                'play_store_url'       => $playStoreUrl,
                'market_url'           => $marketUrl,
            ]);
        } else {
            // ── Beautiful HTML update page for browser requests ──
            http_response_code(200);
            header('Content-Type: text/html; charset=utf-8');
            $notesHtml = implode('', array_map(
                fn($n) => "<li>{$n}</li>",
                $releaseNotes
            ));
            echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Update Required – HeartLink</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at 20% 50%, #3b0a45 0%, #0d0d1a 60%, #000 100%);
    font-family: 'Inter', sans-serif;
    overflow: hidden;
  }
  /* Floating orbs */
  .orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.35;
    animation: drift 8s ease-in-out infinite alternate;
    pointer-events: none;
  }
  .orb1 { width: 420px; height: 420px; background: #e91e8c; top: -100px; left: -120px; }
  .orb2 { width: 340px; height: 340px; background: #7c3aed; bottom: -80px; right: -80px; animation-delay: -4s; }
  .orb3 { width: 220px; height: 220px; background: #f43f5e; top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -2s; }
  @keyframes drift {
    from { transform: translateY(0) scale(1); }
    to   { transform: translateY(30px) scale(1.08); }
  }
  /* Card */
  .card {
    position: relative;
    z-index: 10;
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 28px;
    padding: 48px 40px 40px;
    max-width: 440px;
    width: 90%;
    text-align: center;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(233,30,140,0.15);
    animation: popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.8) translateY(40px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .icon { font-size: 64px; display: block; margin-bottom: 20px; animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.12); }
  }
  h1 {
    font-size: 26px;
    font-weight: 900;
    color: #fff;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #f9a8d4, #e91e8c, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  p {
    font-size: 15px;
    color: rgba(255,255,255,0.7);
    line-height: 1.65;
    margin-bottom: 24px;
  }
  .notes {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px 20px;
    margin-bottom: 28px;
    text-align: left;
  }
  .notes li {
    list-style: none;
    font-size: 13.5px;
    color: rgba(255,255,255,0.65);
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .notes li:last-child { border-bottom: none; }
  .btn {
    display: inline-block;
    width: 100%;
    padding: 16px;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    text-decoration: none;
    background: linear-gradient(135deg, #e91e8c, #7c3aed);
    box-shadow: 0 8px 32px rgba(233,30,140,0.45);
    transition: transform 0.18s, box-shadow 0.18s;
    letter-spacing: 0.3px;
  }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(233,30,140,0.55); }
  .version-badge {
    display: inline-block;
    margin-top: 20px;
    font-size: 11.5px;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="orb orb1"></div>
  <div class="orb orb2"></div>
  <div class="orb orb3"></div>
  <div class="card">
    <span class="icon">💝</span>
    <h1>{$title}</h1>
    <p>{$message}</p>
    <div class="notes"><ul>{$notesHtml}</ul></div>
    <a href="{$playStoreUrl}" class="btn">🚀 Update on Google Play</a>
    <span class="version-badge">Your version: {$clientVersionCode} &nbsp;·&nbsp; Required: {$requiredVersionCode}</span>
  </div>
</body>
</html>
HTML;
        }
        exit;
    }
})();
// ─────────────────────────────────────────────────────────────────────────────

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
