<?php

namespace App\Services;

use Aws\Rekognition\RekognitionClient;
use Illuminate\Support\Facades\Log;

class AmazonRekognitionService
{
    protected ?RekognitionClient $client = null;
    protected float $minConfidence;

    public function __construct()
    {
        $key = env('AWS_ACCESS_KEY_ID');
        $secret = env('AWS_SECRET_ACCESS_KEY');
        $region = env('AWS_DEFAULT_REGION', 'us-east-1');
        $this->minConfidence = (float) env('AWS_REKOGNITION_MIN_CONFIDENCE', 50.0);

        if (!empty($key) && !empty($secret)) {
            try {
                $this->client = new RekognitionClient([
                    'region'      => $region,
                    'version'     => 'latest',
                    'credentials' => [
                        'key'    => $key,
                        'secret' => $secret,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::error('Amazon Rekognition Client Initialization Error: ' . $e->getMessage());
                $this->client = null;
            }
        }
    }

    /**
     * Detect NSFW / Moderation labels on an image file using Amazon Rekognition
     *
     * @param string $filePath Absolute path to the local image file
     * @return array ['is_nsfw' => bool, 'reason' => string|null, 'labels' => array]
     */
    public function detectModeration(string $filePath): array
    {
        // 1. Try Amazon Rekognition API if configured
        if ($this->client !== null && file_exists($filePath)) {
            try {
                $imageBytes = file_get_contents($filePath);
                if ($imageBytes) {
                    $result = $this->client->detectModerationLabels([
                        'Image' => [
                            'Bytes' => $imageBytes,
                        ],
                        'MinConfidence' => $this->minConfidence,
                    ]);

                    $labels = $result->get('ModerationLabels') ?? [];
                    $flaggedLabels = [];

                    $explicitParentCategories = [
                        'Explicit Nudity',
                        'Nudity',
                        'Graphic Male Nudity',
                        'Graphic Female Nudity',
                        'Sexual Activity',
                        'Illustrated Explicit Nudity',
                        'Adult Content',
                        'Visually Explicit',
                        'Partial Nudity',
                        'Revealing Clothes',
                        'Suggestive',
                    ];

                    foreach ($labels as $label) {
                        $name = $label['Name'] ?? '';
                        $parent = $label['ParentName'] ?? '';
                        $confidence = (float) ($label['Confidence'] ?? 0.0);

                        if ($confidence >= $this->minConfidence) {
                            if (in_array($name, $explicitParentCategories) || in_array($parent, $explicitParentCategories)) {
                                $flaggedLabels[] = "{$name} (" . round($confidence, 1) . "%)";
                            }
                        }
                    }

                    if (count($flaggedLabels) > 0) {
                        $reason = 'Amazon Rekognition detected inappropriate content: ' . implode(', ', $flaggedLabels);
                        Log::warning('[Amazon Rekognition NSFW Blocked]: ' . $reason);
                        return [
                            'is_nsfw' => true,
                            'provider' => 'Amazon Rekognition',
                            'reason' => $reason,
                            'labels' => $labels,
                        ];
                    }

                    // Amazon Rekognition inspected and approved the photo!
                    return [
                        'is_nsfw' => false,
                        'provider' => 'Amazon Rekognition',
                        'reason' => null,
                        'labels' => $labels,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warn('Amazon Rekognition API Call Failed: ' . $e->getMessage() . '. Falling back to internal heuristic analyzer.');
            }
        }

        // 2. Fallback / Internal Heuristic Analyzer (Skin Exposure & Nudity Ratio)
        $isNsfw = $this->analyzeSkinExposureHeuristic($filePath);
        return [
            'is_nsfw' => $isNsfw,
            'provider' => 'Internal Analyzer',
            'reason' => $isNsfw ? 'High explicit exposure / nudity ratio detected' : null,
            'labels' => [],
        ];
    }

    /**
     * Fallback skin exposure & color histogram analyzer for NSFW detection
     */
    private function analyzeSkinExposureHeuristic(string $filePath): bool
    {
        if (!file_exists($filePath) || !function_exists('imagecreatefromstring')) {
            return false;
        }

        $contents = @file_get_contents($filePath);
        if (!$contents) return false;

        $gdImg = @imagecreatefromstring($contents);
        if (!$gdImg) return false;

        $width = imagesx($gdImg);
        $height = imagesy($gdImg);

        if ($width <= 0 || $height <= 0) {
            imagedestroy($gdImg);
            return false;
        }

        $sampleW = 100;
        $sampleH = 100;
        $sample = imagecreatetruecolor($sampleW, $sampleH);
        imagecopyresampled($sample, $gdImg, 0, 0, 0, 0, $sampleW, $sampleH, $width, $height);
        imagedestroy($gdImg);

        $skinPixels = 0;
        $totalPixels = $sampleW * $sampleH;
        $centerSkinPixels = 0;

        for ($y = 0; $y < $sampleH; $y++) {
            for ($x = 0; $x < $sampleW; $x++) {
                $rgb = imagecolorat($sample, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;

                $isRgbSkin = ($r > 95) && ($g > 40) && ($b > 20) &&
                             ((max($r, $g, $b) - min($r, $g, $b)) > 15) &&
                             (abs($r - $g) > 15) && ($r > $g) && ($r > $b);

                $cbVal = 128 - 0.168736 * $r - 0.331264 * $g + 0.5 * $b;
                $crVal = 128 + 0.5 * $r - 0.418688 * $g - 0.081312 * $b;
                $isYcbCrSkin = ($cbVal >= 77 && $cbVal <= 127) && ($crVal >= 133 && $crVal <= 173);

                if ($isRgbSkin && $isYcbCrSkin) {
                    $skinPixels++;
                    if ($x >= 20 && $x <= 80 && $y >= 20 && $y <= 80) {
                        $centerSkinPixels++;
                    }
                }
            }
        }

        imagedestroy($sample);

        $overallRatio = $skinPixels / $totalPixels;
        $centerRatio = $centerSkinPixels / (60 * 60);

        return ($overallRatio > 0.42 || $centerRatio > 0.50);
    }
}
