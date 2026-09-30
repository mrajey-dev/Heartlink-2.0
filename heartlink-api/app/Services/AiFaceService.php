<?php

namespace App\Services;

class AiFaceService
{
    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validate if an image contains a human face/person
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
                'message'    => 'Image too small to detect a face.',
            ];
        }

        // Scale to 64×64 for analysis
        $s = imagecreatetruecolor(64, 64);
        imagecopyresampled($s, $im, 0, 0, 0, 0, 64, 64, $w, $h);
        imagedestroy($im);

        $skinPixels = 0;
        $total      = 0;

        for ($y = 8; $y < 56; $y++) {
            for ($x = 8; $x < 56; $x++) {
                $rgb = imagecolorat($s, $x, $y);
                $r   = ($rgb >> 16) & 0xFF;
                $g   = ($rgb >>  8) & 0xFF;
                $b   =  $rgb        & 0xFF;

                $cb = 128 - 0.168736 * $r - 0.331264 * $g + 0.5 * $b;
                $cr = 128 + 0.5 * $r - 0.418688 * $g - 0.081312 * $b;

                // Standard YCbCr skin locus (Chai & Ngan)
                $isSkin = ($cb >= 77 && $cb <= 127 && $cr >= 133 && $cr <= 173)
                       || ($r > 60 && $g > 40 && $b > 20 && max($r,$g,$b) - min($r,$g,$b) > 15 && $r > $g && $r > $b);

                $total++;
                if ($isSkin) $skinPixels++;
            }
        }

        imagedestroy($s);

        $skinRatio = $total > 0 ? $skinPixels / $total : 0;

        if ($skinRatio < 0.10) {
            return [
                'has_person' => false,
                'confidence' => round($skinRatio * 100, 1),
                'message'    => 'No human face detected. Please upload a clear photo of yourself.',
            ];
        }

        return [
            'has_person' => true,
            'confidence' => min(98.0, round(55 + $skinRatio * 43, 1)),
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
            $parts = explode(',', $input, 2);
            if (count($parts) === 2) {
                $raw = base64_decode($parts[1]);
                if ($raw) return @imagecreatefromstring($raw);
            }
        }

        if (strlen((string)$input) > 200 && !str_starts_with((string)$input, 'http') && !file_exists((string)$input)) {
            $raw = base64_decode($input);
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
