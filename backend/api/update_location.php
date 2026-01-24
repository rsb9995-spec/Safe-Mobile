<?php
header("Content-Type: application/json");
require_once 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['session_token']) || !isset($data['lat']) || !isset($data['lng'])) {
    echo json_encode(["status" => "error", "message" => "Invalid Payload"]);
    exit;
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE session_token = ?");
$stmt->execute([$data['session_token']]);
$user = $stmt->fetch();

if ($user) {
    $ins = $pdo->prepare("INSERT INTO locations (user_id, lat, lng, accuracy, speed, battery_level) VALUES (?, ?, ?, ?, ?, ?)");
    $ins->execute([
        $user['id'],
        $data['lat'],
        $data['lng'],
        $data['accuracy'],
        $data['speed'],
        $data['battery']
    ]);
    echo json_encode(["status" => "success", "message" => "Telemetry Uplinked"]);
} else {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
}
?>