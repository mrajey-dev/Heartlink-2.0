// src/components/FaceMappingVerification.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { apiCompareFaces, apiValidatePersonPhoto } from '../services/api';

const { width: SW } = Dimensions.get('window');
const FACE_SIZE = Math.min(SW * 0.56, 220); // Capped so it fits any screen

// 46 facial landmark points for the mesh animation
const LANDMARK_POINTS = [
  // Jaw contour
  { id: 1,  x: 22, y: 40 }, { id: 2,  x: 24, y: 52 }, { id: 3,  x: 27, y: 62 },
  { id: 4,  x: 32, y: 72 }, { id: 5,  x: 40, y: 79 }, { id: 6,  x: 50, y: 82 },
  { id: 7,  x: 60, y: 79 }, { id: 8,  x: 68, y: 72 }, { id: 9,  x: 73, y: 62 },
  { id: 10, x: 76, y: 52 }, { id: 11, x: 78, y: 40 },
  // Left eyebrow
  { id: 12, x: 28, y: 30 }, { id: 13, x: 35, y: 27 }, { id: 14, x: 42, y: 28 },
  // Right eyebrow
  { id: 15, x: 58, y: 28 }, { id: 16, x: 65, y: 27 }, { id: 17, x: 72, y: 30 },
  // Left eye
  { id: 18, x: 33, y: 36 }, { id: 19, x: 38, y: 33 }, { id: 20, x: 43, y: 36 },
  { id: 21, x: 38, y: 40 }, { id: 22, x: 38, y: 36, isPupil: true },
  // Right eye
  { id: 23, x: 57, y: 36 }, { id: 24, x: 62, y: 33 }, { id: 25, x: 67, y: 36 },
  { id: 26, x: 62, y: 40 }, { id: 27, x: 62, y: 36, isPupil: true },
  // Nose
  { id: 28, x: 50, y: 35 }, { id: 29, x: 50, y: 43 }, { id: 30, x: 50, y: 50 },
  { id: 31, x: 44, y: 55 }, { id: 32, x: 50, y: 57 }, { id: 33, x: 56, y: 55 },
  // Mouth
  { id: 34, x: 39, y: 66 }, { id: 35, x: 46, y: 64 }, { id: 36, x: 50, y: 65 },
  { id: 37, x: 54, y: 64 }, { id: 38, x: 61, y: 66 }, { id: 39, x: 55, y: 71 },
  { id: 40, x: 50, y: 72 }, { id: 41, x: 45, y: 71 },
  // Cheekbones + forehead
  { id: 42, x: 30, y: 50 }, { id: 43, x: 70, y: 50 },
  { id: 44, x: 38, y: 22 }, { id: 45, x: 50, y: 19 }, { id: 46, x: 62, y: 22 },
];

// Connection lines for the mesh
const MESH_CONNECTIONS = [
  [1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11], // jaw
  [12,13],[13,14],   // l-brow
  [15,16],[16,17],   // r-brow
  [18,19],[19,20],[20,21],[21,18], // l-eye
  [23,24],[24,25],[25,26],[26,23], // r-eye
  [28,29],[29,30],[30,32],[31,32],[32,33], // nose
  [34,35],[35,36],[36,37],[37,38],[38,39],[39,40],[40,41],[41,34], // mouth
  [44,45],[45,46],   // forehead
  [42,18],[43,23],   // cheek-eye
];

export default function FaceMappingVerification({
  referenceImage,
  onReferenceImageChange,
  verificationSelfie,
  onVerificationSelfieChange,
  isVerified,
  onVerificationComplete,
}) {
  const { theme } = useTheme();

  const getInitialStage = () => {
    if (isVerified) return 'verified_result';
    if (referenceImage && verificationSelfie) return 'verified_result';
    if (referenceImage) return 'capture_selfie';
    return 'upload_reference';
  };

  const [stage, setStage] = useState(getInitialStage);
  const [scanning, setScanning] = useState(false);
  const [matchPct, setMatchPct] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState(null);
  const [validating, setValidating] = useState(false);

  // ─── Animations ────────────────────────────────────────────────────────────
  const laserAnim   = useRef(new Animated.Value(0)).current;
  const meshOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const resultAnim  = useRef(new Animated.Value(0)).current;
  const ringAnim    = useRef(new Animated.Value(0)).current;

  // Pulse ring effect (always running)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Rotating ring effect
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Laser scan animation while scanning
  useEffect(() => {
    if (!scanning) {
      laserAnim.setValue(0);
      meshOpacity.setValue(0);
      return;
    }
    Animated.timing(meshOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanning]);

  // Glow + result fade-in on result stage
  useEffect(() => {
    if (stage === 'verified_result' || stage === 'verification_failed') {
      resultAnim.setValue(0);
      Animated.parallel([
        Animated.timing(resultAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
          ])
        ),
      ]).start();
    }
  }, [stage]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const pickReference = async (useCamera = false) => {
    setValidating(true);
    try {
      let res;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission', 'Enable camera in settings to take a portrait.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1],
          quality: 0.85, cameraType: ImagePicker.CameraType?.front ?? 'front', base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Gallery Permission', 'Enable gallery in settings to select a photo.');
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1],
          quality: 0.85, base64: true,
        });
      }

      if (res.canceled || !res.assets?.[0]?.uri) return;

      const asset = res.assets[0];
      const mime  = asset.mimeType || 'image/jpeg';
      const val   = asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri;

      // Validate person
      try {
        const check = await apiValidatePersonPhoto({ image: val });
        if (check?.has_person === false) {
          Alert.alert(
            '👤 Face Required',
            check.message || 'No human face detected. Use a clear close-up photo of your face.',
            [{ text: 'Try Again', style: 'cancel' }]
          );
          return;
        }
      } catch {
        // Allow on network error – server will recheck
      }

      onReferenceImageChange?.(val);
      setStage('capture_selfie');
    } catch (e) {
      console.warn('pickReference error:', e);
    } finally {
      setValidating(false);
    }
  };

  const captureSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Required', 'Enable camera to take your verification selfie.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1],
        quality: 0.85, cameraType: ImagePicker.CameraType?.front ?? 'front', base64: true,
      });

      if (res.canceled || !res.assets?.[0]?.uri) return;

      const asset = res.assets[0];
      const mime  = asset.mimeType || 'image/jpeg';
      const val   = asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri;

      onVerificationSelfieChange?.(val);
      runMatching(val);
    } catch (e) {
      console.warn('captureSelfie error:', e);
    }
  };

  const runMatching = useCallback(async (selfie) => {
    setStage('scanning_match');
    setScanning(true);
    setMatchPct(0);
    setResult(null);

    const steps = [
      { delay: 500,  pct: 22, text: '👁️ Analyzing inter-pupillary distance…' },
      { delay: 1300, pct: 48, text: '📐 Mapping facial geometry & cheekbones…' },
      { delay: 2200, pct: 68, text: '💎 Measuring jawline curvature & chin…' },
      { delay: 3000, pct: 82, text: '🔬 Computing perceptual biometric score…' },
    ];
    const timers = steps.map(s => setTimeout(() => {
      setMatchPct(s.pct);
      setStatusText(s.text);
    }, s.delay));

    let apiResult = null;
    try {
      apiResult = await apiCompareFaces({
        reference_image: referenceImage,
        selfie_image: selfie || verificationSelfie,
      });
    } catch (e) {
      console.warn('apiCompareFaces error:', e?.message);
    }

    timers.forEach(clearTimeout);

    const finalResult = (apiResult && typeof apiResult.is_match === 'boolean')
      ? apiResult
      : {
          is_match: false, score: 0,
          metrics: { eyes_match: 0, face_shape_match: 0, jawline_match: 0, skin_tone_match: 0 },
          reason: 'Could not reach the verification server. Please check your connection and try again.',
        };

    setTimeout(() => {
      setScanning(false);
      setResult(finalResult);
      setMatchPct(Math.round(finalResult.score ?? 0));
      setStatusText(finalResult.is_match ? '✅ Identity Confirmed!' : '❌ Face Mismatch Detected');
      setStage(finalResult.is_match ? 'verified_result' : 'verification_failed');

      onVerificationComplete?.({
        is_verified: finalResult.is_match,
        video_verified: finalResult.is_match,
        verification_selfie: selfie || verificationSelfie,
        score: finalResult.score,
        metrics: finalResult.metrics,
      });
    }, 3800);
  }, [referenceImage, verificationSelfie, onVerificationComplete]);

  const laserY = laserAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 180] });
  const ringRotate = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ─── Step Indicator ────────────────────────────────────────────────────────
  const steps = [
    { label: 'Portrait', icon: 'person-outline' },
    { label: 'Selfie',   icon: 'camera-outline' },
    { label: 'Verify',   icon: 'shield-checkmark-outline' },
  ];
  const activeStep = { upload_reference: 0, capture_selfie: 1, scanning_match: 2, verified_result: 2, verification_failed: 2 }[stage] ?? 0;

  return (
    <View style={styles.root} collapsable={false}>
      {/* ── STEP BAR ── */}
      <View style={styles.stepBar}>
        {steps.map((s, i) => {
          const done    = i < activeStep || (i === activeStep && (stage === 'verified_result'));
          const active  = i === activeStep && stage !== 'verified_result';
          const failed  = i === activeStep && stage === 'verification_failed';
          return (
            <React.Fragment key={i}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  active  && styles.stepCircleActive,
                  done    && styles.stepCircleDone,
                  failed  && styles.stepCircleFailed,
                ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={13} color="#FFF" />
                  ) : failed ? (
                    <Ionicons name="close" size={13} color="#FFF" />
                  ) : (
                    <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{s.label}</Text>
              </View>
              {i < steps.length - 1 && (
                <View style={[styles.stepLine, i < activeStep && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ═══════════════════════ STAGE 1: UPLOAD REFERENCE ═══════════════════ */}
      {stage === 'upload_reference' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Your Face Portrait</Text>
          <Text style={styles.cardSub}>
            Upload a clear front-facing photo. This will be matched with your live selfie.
          </Text>

          {/* Face Oval with guides */}
          <View style={styles.faceOvalWrap}>
            <Animated.View style={[styles.faceOval, { transform: [{ scale: pulseAnim }] }]}>
              {referenceImage ? (
                <Image source={{ uri: referenceImage }} style={styles.faceOvalImg} resizeMode="cover" />
              ) : (
                <View style={styles.faceOvalPlaceholder}>
                  <Ionicons name="person-outline" size={64} color="rgba(255,0,127,0.35)" />
                  <Text style={styles.faceOvalHint}>Center your face</Text>
                </View>
              )}
              {/* Corner brackets */}
              {['TL','TR','BL','BR'].map(c => (
                <View key={c} style={[styles.bracket, styles[`bracket${c}`]]} />
              ))}
            </Animated.View>

            {/* Rotating ring */}
            <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: ringRotate }] }]} />
          </View>

          {/* Tips */}
          <View style={styles.tipsBox}>
            {[
              { icon: 'sunny-outline', text: 'Good lighting, no shadows on face' },
              { icon: 'eye-outline',   text: 'Eyes open and clearly visible' },
              { icon: 'remove-circle-outline', text: 'No sunglasses, hat, or mask' },
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <Ionicons name={tip.icon} size={14} color="#FF007F" />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => pickReference(false)}
              disabled={validating}
            >
              {validating ? (
                <ActivityIndicator size="small" color="#FF007F" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={18} color="#FF007F" />
                  <Text style={styles.btnOutlineText}>Gallery</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => pickReference(true)}
              disabled={validating}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF007F', '#9333EA']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnPrimaryGrad}
              >
                {validating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="camera" size={18} color="#FFF" />
                    <Text style={styles.btnPrimaryText}>Take Portrait</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══════════════════════ STAGE 2: CAPTURE SELFIE ════════════════════ */}
      {stage === 'capture_selfie' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Take Your Verification Selfie</Text>
          <Text style={styles.cardSub}>
            Use your front camera to take a live selfie. Our AI will compare it with your portrait.
          </Text>

          {/* Reference thumb */}
          <View style={styles.refThumbRow}>
            <Image source={{ uri: referenceImage }} style={styles.refThumbImg} />
            <View style={styles.refThumbBadge}>
              <Ionicons name="checkmark" size={10} color="#FFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.refThumbTitle}>Reference Portrait ✓</Text>
              <Text style={styles.refThumbSub}>Face ready for biometric matching</Text>
            </View>
            <TouchableOpacity onPress={() => setStage('upload_reference')}>
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* What we check */}
          <View style={styles.checksGrid}>
            {[
              { emoji: '👁️', label: 'Eye Alignment',  sub: 'Pupil distance' },
              { emoji: '📐', label: 'Face Shape',      sub: 'Geometry match' },
              { emoji: '💎', label: 'Jawline',         sub: 'Contour curves' },
              { emoji: '🎨', label: 'Skin Tone',       sub: 'Color profile' },
            ].map((c, i) => (
              <View key={i} style={styles.checkTile}>
                <Text style={styles.checkTileEmoji}>{c.emoji}</Text>
                <Text style={styles.checkTileLabel}>{c.label}</Text>
                <Text style={styles.checkTileSub}>{c.sub}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.bigCamBtn}
            onPress={captureSelfie}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#FF007F', '#9333EA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.bigCamBtnGrad}
            >
              <View style={styles.bigCamIcon}>
                <Ionicons name="camera-reverse" size={26} color="#FF007F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigCamTitle}>Open Front Camera</Text>
                <Text style={styles.bigCamSub}>Face the camera for live matching</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════ STAGE 3: SCANNING ══════════════════════════ */}
      {stage === 'scanning_match' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Biometric Analysis</Text>
          <Text style={styles.cardSub}>Mapping your facial structure across both images…</Text>

          {/* Dual face scan panes */}
          <View style={styles.dualPane}>
            {[
              { uri: referenceImage,                          label: 'Portrait', color: '#FF007F' },
              { uri: verificationSelfie || referenceImage,   label: 'Selfie',   color: '#00E5FF' },
            ].map((pane, pi) => (
              <View key={pi} style={styles.scanPane}>
                <Image source={{ uri: pane.uri }} style={styles.scanPaneImg} resizeMode="cover" />

                {/* Mesh nodes */}
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: meshOpacity }]}>
                  {LANDMARK_POINTS.map(pt => (
                    <View
                      key={`${pi}-${pt.id}`}
                      style={[
                        styles.meshDot,
                        pt.isPupil && styles.meshPupil,
                        { left: `${pt.x}%`, top: `${pt.y}%`,
                          backgroundColor: pane.color + (pt.isPupil ? 'FF' : '99') },
                      ]}
                    />
                  ))}
                </Animated.View>

                {/* Laser line */}
                <Animated.View style={[
                  styles.laserLine,
                  { transform: [{ translateY: laserY }], backgroundColor: pane.color },
                ]} />

                <View style={[styles.scanLabel, { borderColor: pane.color + '66' }]}>
                  <Text style={[styles.scanLabelText, { color: pane.color }]}>{pane.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Progress */}
          <View style={styles.progressBox}>
            <View style={styles.progressTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FF007F" />
                <Text style={styles.progressLabel}>Analyzing…</Text>
              </View>
              <Text style={styles.progressPct}>{matchPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={['#FF007F', '#9333EA', '#00E5FF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${matchPct}%` }]}
              />
            </View>
            <Text style={styles.progressStatus}>{statusText}</Text>
          </View>
        </View>
      )}

      {/* ═══════════════════════ STAGE 4A: VERIFIED ════════════════════════ */}
      {stage === 'verified_result' && (
        <Animated.View style={[styles.card, { opacity: resultAnim, transform: [{ scale: resultAnim.interpolate({ inputRange: [0,1], outputRange: [0.92, 1] }) }] }]}>
          <LinearGradient
            colors={['rgba(52,199,89,0.12)', 'rgba(0,229,255,0.08)']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Badge */}
          <View style={styles.resultBadgeWrap}>
            <LinearGradient colors={['#30D158', '#00C896']} style={styles.resultBadgeGrad}>
              <MaterialCommunityIcons name="shield-check" size={48} color="#FFF" />
            </LinearGradient>
            <View style={styles.resultBadgeRing} />
          </View>

          <Text style={styles.resultTitle}>Identity Verified! ✅</Text>
          <Text style={styles.resultSub}>
            {result?.score ? `${Math.round(result.score)}% biometric match` : 'Biometric match'} — eyes, face shape & jawline confirmed.
          </Text>

          {/* Metric tiles */}
          <View style={styles.metricRow}>
            {[
              { label: '👁️ Eyes',  val: result?.metrics?.eyes_match },
              { label: '📐 Shape', val: result?.metrics?.face_shape_match },
              { label: '💎 Jaw',   val: result?.metrics?.jawline_match },
            ].map((m, i) => (
              <View key={i} style={[styles.metricTile, { borderColor: 'rgba(52,199,89,0.3)' }]}>
                <Text style={[styles.metricVal, { color: '#30D158' }]}>
                  {m.val ? `${Math.round(m.val)}%` : '—'}
                </Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Photo pair */}
          <View style={styles.pairRow}>
            <View style={styles.pairItem}>
              <Image source={{ uri: referenceImage }} style={styles.pairImg} />
              <Text style={styles.pairLabel}>Portrait</Text>
            </View>
            <View style={styles.pairCenter}>
              <Ionicons name="link" size={20} color="#30D158" />
              <Text style={styles.pairMatchTag}>Match</Text>
            </View>
            <View style={styles.pairItem}>
              <Image source={{ uri: verificationSelfie || referenceImage }} style={styles.pairImg} />
              <Text style={styles.pairLabel}>Selfie</Text>
            </View>
          </View>

          <Text style={styles.verifiedNote}>
            🛡️ Your identity is verified. Continue to complete registration.
          </Text>
        </Animated.View>
      )}

      {/* ═══════════════════════ STAGE 4B: FAILED ══════════════════════════ */}
      {stage === 'verification_failed' && (
        <Animated.View style={[styles.card, { opacity: resultAnim }]}>
          <LinearGradient
            colors={['rgba(255,55,95,0.15)', 'rgba(255,149,0,0.08)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.resultBadgeWrap}>
            <LinearGradient colors={['#FF375F', '#FF6B00']} style={styles.resultBadgeGrad}>
              <Ionicons name="close-circle" size={48} color="#FFF" />
            </LinearGradient>
          </View>

          <Text style={styles.resultTitle}>Faces Don't Match ❌</Text>
          <Text style={styles.resultSub}>
            {result?.reason || 'The selfie does not match your reference portrait. Please retry.'}
          </Text>

          {/* Metric tiles – red */}
          <View style={styles.metricRow}>
            {[
              { label: '👁️ Eyes',  val: result?.metrics?.eyes_match },
              { label: '📐 Shape', val: result?.metrics?.face_shape_match },
              { label: '💎 Jaw',   val: result?.metrics?.jawline_match },
            ].map((m, i) => (
              <View key={i} style={[styles.metricTile, { borderColor: 'rgba(255,55,95,0.3)' }]}>
                <Text style={[styles.metricVal, { color: '#FF375F' }]}>
                  {m.val ? `${Math.round(m.val)}%` : '—'}
                </Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Retry / change */}
          <TouchableOpacity style={styles.btnPrimary} onPress={captureSelfie} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FF375F', '#FF6B00']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnPrimaryGrad}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.btnPrimaryText}>Retry Selfie</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, { marginTop: 10 }]}
            onPress={() => { onReferenceImageChange?.(null); setStage('upload_reference'); }}
          >
            <Ionicons name="images-outline" size={16} color="#FF007F" />
            <Text style={styles.btnOutlineText}>Change Portrait Photo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    // Don't use flex:1 inside ScrollView — causes layout collapse
    width: '100%',
  },

  // Step bar
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  stepItem: { alignItems: 'center', gap: 5, minWidth: 56 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { borderColor: '#FF007F', backgroundColor: 'rgba(255,0,127,0.18)' },
  stepCircleDone:   { backgroundColor: '#30D158', borderColor: '#30D158' },
  stepCircleFailed: { backgroundColor: '#FF375F', borderColor: '#FF375F' },
  stepNum:      { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },
  stepNumActive:{ color: '#FF007F' },
  stepLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '500', textAlign: 'center' },
  stepLabelActive: { color: '#FF007F', fontWeight: '700' },
  stepLine:     { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#30D158' },

  // Card container
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    overflow: 'hidden',
    marginBottom: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 4, letterSpacing: 0.2 },
  cardSub:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17, marginBottom: 16 },

  // Face oval — kept proportional & compact
  faceOvalWrap: { alignItems: 'center', marginBottom: 16 },
  faceOval: {
    width: FACE_SIZE, height: FACE_SIZE * 1.18,
    borderRadius: FACE_SIZE * 0.55,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 2.5, borderColor: 'rgba(255,0,127,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  faceOvalImg: { width: '100%', height: '100%' },
  faceOvalPlaceholder: { alignItems: 'center', gap: 10 },
  faceOvalHint: { fontSize: 11, color: 'rgba(255,0,127,0.5)', fontWeight: '600' },
  rotatingRing: {
    position: 'absolute',
    width: FACE_SIZE + 18, height: FACE_SIZE * 1.18 + 18,
    borderRadius: (FACE_SIZE + 18) * 0.55,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#FF007F',
    borderRightColor: '#9333EA55',
  },

  // Brackets
  bracket: {
    position: 'absolute', width: 18, height: 18,
    borderColor: '#FF007F', borderWidth: 0,
  },
  bracketTL: { top: 8,  left: 12,  borderTopWidth: 2.5,  borderLeftWidth: 2.5 },
  bracketTR: { top: 8,  right: 12, borderTopWidth: 2.5,  borderRightWidth: 2.5 },
  bracketBL: { bottom: 8, left: 12, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  bracketBR: { bottom: 8, right: 12, borderBottomWidth: 2.5, borderRightWidth: 2.5 },

  // Tips
  tipsBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 12, gap: 7, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipIcon: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,0,127,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tipText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 17 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnOutline: {
    flex: 1, height: 46, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FF007F',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnOutlineText: { color: '#FF007F', fontSize: 14, fontWeight: '700' },
  btnPrimary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnPrimaryGrad: {
    height: 46, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 12,
  },
  btnPrimaryText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Selfie stage
  refThumbRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  refThumbImg: { width: 52, height: 52, borderRadius: 10 },
  refThumbBadge: {
    position: 'absolute', left: 48, top: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#30D158', alignItems: 'center', justifyContent: 'center',
  },
  refThumbTitle: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  refThumbSub:   { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  changeBtn: { fontSize: 12, color: '#FF007F', fontWeight: '700', paddingLeft: 4 },

  checksGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  checkTile: {
    flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  checkTileEmoji: { fontSize: 24 },
  checkTileLabel: { fontSize: 12, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  checkTileSub:   { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  bigCamBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  bigCamBtnGrad: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14, gap: 12,
  },
  bigCamIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bigCamTitle: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  bigCamSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  // Scanning stage
  dualPane: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  scanPane: {
    flex: 1, aspectRatio: 0.82, maxHeight: 200, borderRadius: 16,
    overflow: 'hidden', backgroundColor: '#111',
  },
  scanPaneImg: { width: '100%', height: '100%' },
  meshDot: {
    position: 'absolute', width: 4, height: 4, borderRadius: 2,
    marginLeft: -2, marginTop: -2,
  },
  meshPupil: { width: 6, height: 6, borderRadius: 3, marginLeft: -3, marginTop: -3 },
  laserLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    opacity: 0.75,
  },
  scanLabel: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1,
  },
  scanLabelText: { fontSize: 11, fontWeight: '800' },

  progressBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  progressTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  progressLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  progressPct:   { fontSize: 22, fontWeight: '800', color: '#FF007F' },
  progressTrack: {
    height: 7, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressStatus: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 17 },

  // Result stages
  resultBadgeWrap: { alignItems: 'center', marginBottom: 14, marginTop: 4 },
  resultBadgeGrad: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  resultBadgeRing: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: 'rgba(48,209,88,0.3)',
  },
  resultTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 6, letterSpacing: 0.2 },
  resultSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 17, marginBottom: 16, paddingHorizontal: 8 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricTile: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
    borderWidth: 1, gap: 4,
  },
  metricVal:   { fontSize: 17, fontWeight: '800' },
  metricLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: '600', textAlign: 'center' },

  pairRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 14, marginBottom: 14,
  },
  pairItem: { alignItems: 'center', gap: 6 },
  pairImg:  { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  pairLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  pairCenter: { alignItems: 'center', gap: 4 },
  pairMatchTag: { fontSize: 10, color: '#30D158', fontWeight: '700' },

  verifiedNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 17, paddingHorizontal: 8,
  },
});
