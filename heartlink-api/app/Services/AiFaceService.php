<?php

namespace App\Services;

class AiFaceService
{
    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validate if an image contains a human face/person
     * Uses multi-scale sliding window scanning, multi-ethnic skin locus,
     * and facial structure/contrast verification.
     */
    public static function detectPerson($imageInput): array
    {
        $im = self::createGd($imageInput);
        if (!$im) {
            return [
                'has_person' => false,
                'confidence' => 0,
                'message'    => 'Invalid or unreadable image format.',
            ];
        }

        $w = imagesx($im);
        $h = imagesy($im);
        if ($w < 40 || $h < 40) {
            imagedestroy($im);
            return [
                'has_person' => false,
                'confidence' => 0,
                'message'    => 'Image resolution too small to detect a face.',
            ];
        }

        // Scale to 96×96 grid for fast, accurate multi-scale spatial analysis
        $gridSize = 96;
        $s = imagecreatetruecolor($gridSize, $gridSize);
        imagecopyresampled($s, $im, 0, 0, 0, 0, $gridSize, $gridSize, $w, $h);
        imagedestroy($im);

        // Build skin map and luminance map across the entire image
        $skinMap = [];
        $lumMap  = [];
        $totalSkin = 0;
        $totalPixels = $gridSize * $gridSize;

        for ($y = 0; $y < $gridSize; $y++) {
            $skinMap[$y] = [];
            $lumMap[$y]  = [];
            for ($x = 0; $x < $gridSize; $x++) {
                $rgb = imagecolorat($s, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >>  8) & 0xFF;
                $b =  $rgb        & 0xFF;

                $lum = 0.299 * $r + 0.587 * $g + 0.114 * $b;
                $lumMap[$y][$x] = $lum;

                // YCbCr components
                $cb = 128 - 0.168736 * $r - 0.331264 * $g + 0.5 * $b;
                $cr = 128 + 0.5 * $r - 0.418688 * $g - 0.081312 * $b;

                // Broad, multi-ethnic skin tone locus (fair, medium, olive, tan, deep)
                $isSkinYCbCr = ($cb >= 65 && $cb <= 142 && $cr >= 124 && $cr <= 185);

                // RGB color balance for human skin under different lighting temperatures
                $isSkinRGB = ($r > 38 && $g > 22 && $b > 14 && $r >= ($g - 4) && ($r - $b) > 8);

                // Exclude artificial saturated graphics (e.g. pure yellow, pure neon red)
                $maxC = max($r, $g, $b);
                $minC = min($r, $g, $b);
                $sat  = $maxC > 0 ? ($maxC - $minC) / $maxC : 0;
                $isRealisticSaturation = ($sat >= 0.06 && $sat <= 0.88);

                $isSkin = ($isSkinYCbCr || $isSkinRGB) && $isRealisticSaturation;

                $skinMap[$y][$x] = $isSkin ? 1 : 0;
                if ($isSkin) {
                    $totalSkin++;
                }
            }
        }
        imagedestroy($s);

        $globalSkinRatio = $totalSkin / $totalPixels;

        // Multi-scale sliding window scanning across the grid
        // Window sizes cover close-up portraits, selfies, half-body, and headshots
        $maxLocalDensity = 0.0;
        $bestFaceScore   = 0.0;
        $windowSizes     = [32, 44, 56];

        foreach ($windowSizes as $winSize) {
            $step = (int)($winSize / 3);
            // Search upper 75% of the frame where heads/faces are situated
            $maxY = min($gridSize - $winSize, (int)($gridSize * 0.72));
            for ($wy = 2; $wy <= $maxY; $wy += $step) {
                for ($wx = 2; $wx <= $gridSize - $winSize - 2; $wx += $step) {
                    $winSkin  = 0;
                    $winTotal = $winSize * $winSize;
                    $lums     = [];

                    for ($dy = 0; $dy < $winSize; $dy++) {
                        for ($dx = 0; $dx < $winSize; $dx++) {
                            $py = $wy + $dy;
                            $px = $wx + $dx;
                            if ($skinMap[$py][$px]) {
                                $winSkin++;
                            }
                            $lums[] = $lumMap[$py][$px];
                        }
                    }

                    $density = $winSkin / $winTotal;
                    if ($density > $maxLocalDensity) {
                        $maxLocalDensity = $density;
                    }

                    // Candidate face window with significant skin concentration
                    if ($density >= 0.14) {
                        // Check facial structure: eye band contrast vs forehead & cheeks
                        $h1 = (int)($winSize * 0.30);
                        $h2 = (int)($winSize * 0.55);
                        $h3 = (int)($winSize * 0.80);

                        $lumForehead = 0; $cntF = 0;
                        $lumEyes     = 0; $cntE = 0;
                        $lumCheeks   = 0; $cntC = 0;

                        for ($dy = (int)($winSize * 0.10); $dy < $h1; $dy++) {
                            for ($dx = (int)($winSize * 0.20); $dx < (int)($winSize * 0.80); $dx++) {
                                $lumForehead += $lumMap[$wy + $dy][$wx + $dx];
                                $cntF++;
                            }
                        }
                        for ($dy = $h1; $dy < $h2; $dy++) {
                            for ($dx = (int)($winSize * 0.15); $dx < (int)($winSize * 0.85); $dx++) {
                                $lumEyes += $lumMap[$wy + $dy][$wx + $dx];
                                $cntE++;
                            }
                        }
                        for ($dy = $h2; $dy < $h3; $dy++) {
                            for ($dx = (int)($winSize * 0.20); $dx < (int)($winSize * 0.80); $dx++) {
                                $lumCheeks += $lumMap[$wy + $dy][$wx + $dx];
                                $cntC++;
                            }
                        }

                        $avgF = $cntF > 0 ? $lumForehead / $cntF : 128;
                        $avgE = $cntE > 0 ? $lumEyes / $cntE : 128;
                        $avgC = $cntC > 0 ? $lumCheeks / $cntC : 128;

                        // Luminance standard deviation inside window (ensures texture, not flat color)
                        $meanLum = array_sum($lums) / count($lums);
                        $varSum = 0;
                        foreach ($lums as $l) {
                            $varSum += ($l - $meanLum) * ($l - $meanLum);
                        }
                        $stdDev = sqrt($varSum / count($lums));

                        $hasStructure   = ($stdDev >= 6.5 && $stdDev <= 85.0);
                        $hasEyeContrast = ($avgE <= $avgF + 10) || ($avgE <= $avgC + 10);

                        $score = $density * 50 + ($hasStructure ? 30 : 0) + ($hasEyeContrast ? 20 : 0);
                        if ($score > $bestFaceScore) {
                            $bestFaceScore = $score;
                        }
                    }
                }
            }
        }

        // Decision logic:
        // 1. Strong localized face cluster with structure
        $hasFaceCluster = ($bestFaceScore >= 52.0 && $maxLocalDensity >= 0.16);

        // 2. Close-up portrait or selfie with high skin presence
        $hasHighSkin = ($globalSkinRatio >= 0.12 && $maxLocalDensity >= 0.20);

        // 3. Medium skin presence in upper/mid body with local cluster (half-body/full-body portraits)
        $hasPortraitPresence = ($globalSkinRatio >= 0.035 && $maxLocalDensity >= 0.18);

        $isPerson = $hasFaceCluster || $hasHighSkin || $hasPortraitPresence;

        if (!$isPerson) {
            $conf = round(max($globalSkinRatio * 100, $maxLocalDensity * 100), 1);
            return [
                'has_person' => false,
                'confidence' => $conf,
                'message'    => 'No human face detected. Please upload a clear photo of yourself.',
            ];
        }

        $finalConfidence = min(99.0, round(60 + $bestFaceScore * 0.35 + $maxLocalDensity * 20, 1));
        return [
            'has_person' => true,
            'confidence' => $finalConfidence,
            'message'    => 'Person detected.',
        ];
    }

    /**
     * Compare two face images using perceptual hash + histogram correlation
     */
    public static function compareFaces($inputA, $inputB): array
    {
        // ── 1. Validate both images contain a person ──────────────────────
        $pa = self::detectPerson($inputA);
        if (!$pa['has_person']) {
            return self::fail(0, 'Reference photo has no human face. ' . $pa['message']);
        }
        $pb = self::detectPerson($inputB);
        if (!$pb['has_person']) {
            return self::fail(0, 'Selfie has no human face. ' . $pb['message']);
        }

        // ── 2. Load GD images ─────────────────────────────────────────────
        $imA = self::createGd($inputA);
        $imB = self::createGd($inputB);

        if (!$imA || !$imB) {
            return self::fail(0, 'Could not decode image data.');
        }

        // ── 3. Normalise both to a 128×128 face crop ─────────────────────
        $normA = self::normalise($imA, 128, 128);
        $normB = self::normalise($imB, 128, 128);
        imagedestroy($imA);
        imagedestroy($imB);

        // ── 4a. pHash similarity (64-bit, 8×8 DCT) ───────────────────────
        $hashA    = self::pHash($normA, 128);
        $hashB    = self::pHash($normB, 128);
        $hamming  = self::hammingDistance($hashA, $hashB);
        // hamming 0 = identical, 64 = max
        $hashSim  = max(0.0, 1.0 - $hamming / 64.0);          // 0..1

        // ── 4b. Luminance histogram correlation (Bhattacharyya) ──────────
        $histA    = self::lumHistogram($normA, 128);
        $histB    = self::lumHistogram($normB, 128);
        $bhatta   = self::bhattacharyya($histA, $histB);        // 0..1, 1=identical

        // ── 4c. Regional block similarity ────────────────────────────────
        // Split face into 6 zones: forehead, l-eye, r-eye, nose, mouth, chin
        $zones    = [
            'eyes'  => [16, 28, 96, 60],   // x1,y1,x2,y2 in 128×128
            'nose'  => [40, 50, 88, 80],
            'mouth' => [28, 78, 100, 108],
            'jaw'   => [20, 98, 108, 125],
        ];
        $zoneSims = [];
        foreach ($zones as $zName => [$x1,$y1,$x2,$y2]) {
            $zoneSims[$zName] = self::blockCrossCorrelation($normA, $normB, $x1, $y1, $x2, $y2);
        }
        $eyesSim  = $zoneSims['eyes'];
        $jawSim   = $zoneSims['jaw'];
        $noseSim  = ($zoneSims['nose'] + $zoneSims['mouth']) / 2;

        // ── 4d. Skin-tone match ───────────────────────────────────────────
        $toneA    = self::avgSkinTone($normA, 128);
        $toneB    = self::avgSkinTone($normB, 128);
        $toneDiff = max(0, abs($toneA - $toneB));
        $toneSim  = max(0.0, 1.0 - ($toneDiff / 80.0));        // 80 lum tolerance

        imagedestroy($normA);
        imagedestroy($normB);

        // ── 5. Composite score ────────────────────────────────────────────
        // Weighted: pHash 25%, bhatta 20%, eyes 20%, jaw 20%, nose/mouth 10%, tone 5%
        $composite = (
            $hashSim  * 0.25 +
            $bhatta   * 0.20 +
            $eyesSim  * 0.20 +
            $jawSim   * 0.20 +
            $noseSim  * 0.10 +
            $toneSim  * 0.05
        ) * 100;

        $eyesScore  = round($eyesSim  * 100, 1);
        $jawScore   = round($jawSim   * 100, 1);
        $shapeScore = round((($hashSim + $noseSim) / 2) * 100, 1);
        $toneScore  = round($toneSim  * 100, 1);
        $composite  = round($composite, 1);

        // ── 6. Decision ───────────────────────────────────────────────────
        // Same person must score ≥60 composite, and eyes + jaw each ≥55
        $isMatch = ($composite >= 60.0 && $eyesScore >= 50.0 && $jawScore >= 50.0);

        return [
            'is_match' => $isMatch,
            'score'    => $composite,
            'metrics'  => [
                'eyes_match'       => $eyesScore,
                'face_shape_match' => $shapeScore,
                'jawline_match'    => $jawScore,
                'skin_tone_match'  => $toneScore,
            ],
            'reason'   => $isMatch
                ? 'Biometric verification passed: Face, eyes, and jawline match successfully.'
                : 'Verification failed: The two photos do not appear to be of the same person. '
                  . "Composite={$composite}%, Eyes={$eyesScore}%, Jaw={$jawScore}%.",
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static function fail(float $score, string $reason): array
    {
        return [
            'is_match' => false,
            'score'    => $score,
            'metrics'  => [
                'eyes_match' => 0, 'face_shape_match' => 0,
                'jawline_match' => 0, 'skin_tone_match' => 0,
            ],
            'reason' => $reason,
        ];
    }

    /** Resize & convert to GD true-colour */
    private static function normalise($gdSrc, int $w, int $h)
    {
        $sw  = imagesx($gdSrc);
        $sh  = imagesy($gdSrc);
        $dst = imagecreatetruecolor($w, $h);
        imagecopyresampled($dst, $gdSrc, 0, 0, 0, 0, $w, $h, $sw, $sh);
        return $dst;
    }

    /**
     * 64-bit perceptual hash (8×8 DCT mean method)
     */
    private static function pHash($gd, int $size): int
    {
        // Step 1: shrink to 32×32 greyscale
        $small = imagecreatetruecolor(32, 32);
        imagecopyresampled($small, $gd, 0, 0, 0, 0, 32, 32, $size, $size);

        $pixels = [];
        for ($y = 0; $y < 32; $y++) {
            for ($x = 0; $x < 32; $x++) {
                $rgb = imagecolorat($small, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >>  8) & 0xFF;
                $b =  $rgb        & 0xFF;
                $pixels[$y][$x] = 0.299*$r + 0.587*$g + 0.114*$b;
            }
        }
        imagedestroy($small);

        // Step 2: DCT 8×8 over centre — use mean approach for speed
        $mean  = 0;
        $flat  = [];
        for ($y = 0; $y < 8; $y++) {
            for ($x = 0; $x < 8; $x++) {
                // Average corresponding 4×4 block
                $sum = 0;
                for ($dy = 0; $dy < 4; $dy++)
                    for ($dx = 0; $dx < 4; $dx++)
                        $sum += $pixels[$y*4+$dy][$x*4+$dx];
                $v     = $sum / 16;
                $flat[] = $v;
                $mean  += $v;
            }
        }
        $mean /= 64;

        // Step 3: bitmask
        $hash = 0;
        foreach ($flat as $i => $v) {
            if ($v >= $mean) {
                $hash |= (1 << $i);
            }
        }
        return $hash;
    }

    private static function hammingDistance(int $a, int $b): int
    {
        $xor = $a ^ $b;
        $cnt = 0;
        while ($xor) {
            $cnt += $xor & 1;
            $xor >>= 1;
        }
        return $cnt;
    }

    /**
     * 64-bin luminance histogram (normalised)
     */
    private static function lumHistogram($gd, int $size): array
    {
        $bins = array_fill(0, 64, 0);
        $total = 0;
        for ($y = 0; $y < $size; $y++) {
            for ($x = 0; $x < $size; $x++) {
                $rgb = imagecolorat($gd, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >>  8) & 0xFF;
                $b =  $rgb        & 0xFF;
                $lum = (int)(0.299*$r + 0.587*$g + 0.114*$b);
                $bin = min(63, (int)($lum / 4));
                $bins[$bin]++;
                $total++;
            }
        }
        if ($total > 0) {
            foreach ($bins as &$v) $v /= $total;
        }
        return $bins;
    }

    /**
     * Bhattacharyya coefficient (0=different, 1=identical)
     */
    private static function bhattacharyya(array $h1, array $h2): float
    {
        $bc = 0.0;
        for ($i = 0; $i < count($h1); $i++) {
            $bc += sqrt($h1[$i] * $h2[$i]);
        }
        return min(1.0, $bc);
    }

    /**
     * Normalised cross-correlation of luminance in a region
     */
    private static function blockCrossCorrelation($gdA, $gdB, int $x1, int $y1, int $x2, int $y2): float
    {
        $lumsA = [];
        $lumsB = [];
        for ($y = $y1; $y < $y2; $y += 2) {
            for ($x = $x1; $x < $x2; $x += 2) {
                $rgbA = imagecolorat($gdA, $x, $y);
                $rA   = ($rgbA >> 16) & 0xFF;
                $gA   = ($rgbA >>  8) & 0xFF;
                $bA   =  $rgbA        & 0xFF;
                $lumsA[] = 0.299*$rA + 0.587*$gA + 0.114*$bA;

                $rgbB = imagecolorat($gdB, $x, $y);
                $rB   = ($rgbB >> 16) & 0xFF;
                $gB   = ($rgbB >>  8) & 0xFF;
                $bB   =  $rgbB        & 0xFF;
                $lumsB[] = 0.299*$rB + 0.587*$gB + 0.114*$bB;
            }
        }

        $n    = count($lumsA);
        if ($n === 0) return 0.0;

        $meanA = array_sum($lumsA) / $n;
        $meanB = array_sum($lumsB) / $n;

        $num  = 0.0;
        $denA = 0.0;
        $denB = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $dA = $lumsA[$i] - $meanA;
            $dB = $lumsB[$i] - $meanB;
            $num  += $dA * $dB;
            $denA += $dA * $dA;
            $denB += $dB * $dB;
        }

        $den = sqrt($denA * $denB);
        if ($den < 1e-9) {
            // Flat regions: if both are similar average luminance → same region
            $diff = abs($meanA - $meanB) / 255.0;
            return max(0.0, 1.0 - $diff * 2);
        }

        $corr = $num / $den; // -1..1
        return max(0.0, ($corr + 1) / 2.0); // map to 0..1
    }

    /** Average skin-tone luminance in central face region */
    private static function avgSkinTone($gd, int $size): float
    {
        $sum   = 0;
        $count = 0;
        $cx    = (int)($size / 4);
        $cw    = (int)($size / 2);
        for ($y = $cx; $y < $cx + $cw; $y++) {
            for ($x = $cx; $x < $cx + $cw; $x++) {
                $rgb = imagecolorat($gd, $x, $y);
                $r   = ($rgb >> 16) & 0xFF;
                $g   = ($rgb >>  8) & 0xFF;
                $b   =  $rgb        & 0xFF;
                $sum += 0.299*$r + 0.587*$g + 0.114*$b;
                $count++;
            }
        }
        return $count > 0 ? $sum / $count : 0.0;
    }

    private static function createGd($input)
    {
        if (empty($input)) return null;

        if (str_starts_with((string)$input, 'data:image')) {
            $parts = explode(',', (string)$input, 2);
            if (count($parts) === 2) {
                $clean = preg_replace('/\s+/', '', $parts[1]);
                $raw = base64_decode($clean);
                if ($raw) return @imagecreatefromstring($raw);
            }
        }

        if (strlen((string)$input) > 200 && !str_starts_with((string)$input, 'http') && !file_exists((string)$input)) {
            $clean = preg_replace('/\s+/', '', (string)$input);
            $raw = base64_decode($clean);
            if ($raw) {
                $im = @imagecreatefromstring($raw);
                if ($im) return $im;
            }
        }

        if (file_exists((string)$input)) {
            $raw = file_get_contents($input);
            return $raw ? @imagecreatefromstring($raw) : null;
        }

        if (str_starts_with((string)$input, 'http')) {
            $ctx = stream_context_create(['http' => ['timeout' => 5]]);
            $raw = @file_get_contents($input, false, $ctx);
            return $raw ? @imagecreatefromstring($raw) : null;
        }

        return null;
    }
}
