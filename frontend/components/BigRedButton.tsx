import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

const HOLD_DURATION = 3000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(SCREEN_WIDTH * 0.52, 220);

// Emergency red tokens — the button stays red
const colors = {
  bgPrimary: '#080808',

  ready: '#DC3030',
  readyDark: '#A82020',
  confirmed: '#5C8A6E',
  confirmedBright: '#7AAE8C',

  glow: '#EF4040',

  ring: 'rgba(220, 48, 48, 0.15)',
  ringActive: 'rgba(220, 48, 48, 0.4)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8A8580',
  textMuted: '#5C5955',

  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(220, 48, 48, 0.3)',
};

const STAGES = [
  { threshold: 0, messageKey: 'bigRedButton.holdToAlert', subKey: 'bigRedButton.circleNotified' },
  { threshold: 0.33, messageKey: 'bigRedButton.keepHolding', subKey: 'bigRedButton.preparingAlert' },
  { threshold: 0.66, messageKey: 'bigRedButton.almostThere', subKey: 'bigRedButton.stayWithMe' },
  { threshold: 0.95, messageKey: 'bigRedButton.sending', subKey: 'bigRedButton.helpOnTheWay' },
];

type Props = {
  onActivate: () => void;
  disabled?: boolean;
};

export function BigRedButton({ onActivate, disabled }: Props) {
  const { t } = useTranslation();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [isActivated, setIsActivated] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.08)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const innerPulse = useRef(new Animated.Value(0)).current;

  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  const burstScale = useRef(new Animated.Value(1)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burst2Scale = useRef(new Animated.Value(1)).current;
  const burst2Opacity = useRef(new Animated.Value(0)).current;
  const burst3Scale = useRef(new Animated.Value(1)).current;
  const burst3Opacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (!isHolding && !disabled) {
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.12, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.08, duration: 2000, useNativeDriver: true }),
        ])
      );
      breathe.start();
      glow.start();
      return () => { breathe.stop(); glow.stop(); };
    }
  }, [isHolding, disabled]);

  const triggerRipple = (scale: Animated.Value, opacity: Animated.Value, delay: number = 0) => {
    setTimeout(() => {
      scale.setValue(1);
      opacity.setValue(0.6);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }, delay);
  };

  const startHold = () => {
    if (disabled) return;
    setIsHolding(true);
    setCurrentStage(0);
    startTime.current = Date.now();
    Vibration.vibrate(30);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, damping: 15, stiffness: 200 }),
      Animated.timing(glowAnim, { toValue: 0.12, duration: 150, useNativeDriver: true }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(innerPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(innerPulse, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    triggerRipple(ring1Scale, ring1Opacity, 0);
    rippleInterval.current = setInterval(() => {
      triggerRipple(ring1Scale, ring1Opacity, 0);
      triggerRipple(ring2Scale, ring2Opacity, 200);
      triggerRipple(ring3Scale, ring3Opacity, 400);
    }, 600);

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const newProgress = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(newProgress);

      const newStage = STAGES.reduce((acc, stage, idx) => {
        return newProgress >= stage.threshold ? idx : acc;
      }, 0);

      if (newStage !== currentStage) {
        setCurrentStage(newStage);
        Vibration.vibrate(newStage === 3 ? [0, 40, 30, 40] : 20);
      }
    }, 16);

    holdTimer.current = setTimeout(() => {
      playActivationBurst();
    }, HOLD_DURATION);
  };

  const playActivationBurst = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (rippleInterval.current) clearInterval(rippleInterval.current);
    innerPulse.stopAnimation();

    setIsActivated(true);
    setIsHolding(false);
    Vibration.vibrate([0, 80, 50, 80, 50, 120, 80, 200]);

    flashOpacity.setValue(0.9);
    Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, damping: 8, stiffness: 300 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }),
    ]).start();

    const triggerBurst = (scale: Animated.Value, opacity: Animated.Value, delay: number, maxScale: number) => {
      setTimeout(() => {
        scale.setValue(1);
        opacity.setValue(0.8);
        Animated.parallel([
          Animated.timing(scale, { toValue: maxScale, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      }, delay);
    };

    triggerBurst(burstScale, burstOpacity, 0, 2.5);
    triggerBurst(burst2Scale, burst2Opacity, 100, 3);
    triggerBurst(burst3Scale, burst3Opacity, 200, 3.5);

    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200, delay: 150 }),
      Animated.timing(successOpacity, { toValue: 1, duration: 200, delay: 150, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 250, delay: 250 }),
    ]).start();

    Animated.timing(glowAnim, { toValue: 0.12, duration: 300, useNativeDriver: true }).start();

    onActivate();

    setTimeout(() => { resetButton(); }, 1500);
  };

  const cancelHold = () => {
    if (isHolding) Vibration.vibrate(15);
    resetButton();
  };

  const resetButton = () => {
    setIsHolding(false);
    setIsActivated(false);
    setProgress(0);
    setCurrentStage(0);

    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (rippleInterval.current) clearInterval(rippleInterval.current);
    holdTimer.current = null;
    progressInterval.current = null;
    rippleInterval.current = null;

    innerPulse.stopAnimation();
    innerPulse.setValue(0);
    successScale.setValue(0.8);
    successOpacity.setValue(0);
    checkScale.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
      Animated.timing(glowAnim, { toValue: 0.08, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const countdown = Math.ceil((1 - progress) * 3);
  const stage = STAGES[currentStage];

  const getButtonColors = (): [string, string] => {
    if (disabled) return ['#3D3A38', '#252525'];
    if (isActivated) return [colors.confirmedBright, colors.confirmed];
    if (!isHolding) return [colors.ready, colors.readyDark];
    if (progress < 0.33) return ['#DC3030', '#A82020'];
    if (progress < 0.66) return ['#D45030', '#A83820'];
    if (progress < 0.95) return ['#D4913B', '#B07828'];
    return [colors.confirmedBright, colors.confirmed];
  };

  const RING_GAP = 24;
  const RING_SIZE = BUTTON_SIZE + RING_GAP * 2;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.screenFlash, { opacity: flashOpacity }]} pointerEvents="none" />

      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: glowAnim,
            transform: [{ scale: isActivated ? 1.5 : isHolding ? 1.3 : breatheAnim }],
            backgroundColor: isActivated
              ? 'rgba(92, 138, 110, 0.12)'
              : isHolding && progress > 0.66
              ? 'rgba(212, 145, 59, 0.10)'
              : 'rgba(220, 48, 48, 0.08)',
          },
        ]}
      />

      <Animated.View style={[styles.burstRing, { transform: [{ scale: burstScale }], opacity: burstOpacity }]} />
      <Animated.View style={[styles.burstRing, { transform: [{ scale: burst2Scale }], opacity: burst2Opacity }]} />
      <Animated.View style={[styles.burstRing, { transform: [{ scale: burst3Scale }], opacity: burst3Opacity }]} />

      <Animated.View style={[styles.rippleRing, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
      <Animated.View style={[styles.rippleRing, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />
      <Animated.View style={[styles.rippleRing, { transform: [{ scale: ring3Scale }], opacity: ring3Opacity }]} />

      <View style={[styles.progressRing, { width: RING_SIZE, height: RING_SIZE }]}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={(RING_SIZE - 8) / 2}
            stroke={isActivated ? 'rgba(92, 138, 110, 0.3)' : colors.border}
            strokeWidth={3}
            fill="transparent"
          />
          {(isHolding || isActivated) && (
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={(RING_SIZE - 8) / 2}
              stroke={isActivated ? colors.confirmed : progress > 0.66 ? '#D4913B' : colors.glow}
              strokeWidth={4}
              fill="transparent"
              strokeDasharray={`${(isActivated ? 1 : progress) * Math.PI * (RING_SIZE - 8)} ${Math.PI * (RING_SIZE - 8)}`}
              strokeLinecap="round"
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          )}
        </Svg>
      </View>

      <Animated.View
        style={[
          styles.buttonOuter,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, isHolding || isActivated ? 1 : breatheAnim) }],
            shadowColor: isActivated ? colors.confirmed : colors.ready,
          },
        ]}
      >
        <Pressable onPressIn={startHold} onPressOut={cancelHold} disabled={disabled} style={styles.pressable}>
          <LinearGradient
            colors={getButtonColors()}
            locations={[0, 1]}
            style={styles.buttonGradient}
          >
            {isHolding && (
              <Animated.View style={[styles.innerPulseGlow, { opacity: innerPulse }]} />
            )}

            <View style={styles.content}>
              {isActivated ? (
                <Animated.View style={[styles.successContent, { transform: [{ scale: checkScale }] }]}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.sentLabel}>{t('bigRedButton.sent')}</Text>
                </Animated.View>
              ) : isHolding ? (
                <>
                  <Text style={styles.countdown}>{countdown}</Text>
                  <View style={styles.stageIndicator}>
                    <View style={[styles.stageDot, progress > 0 && styles.stageDotActive]} />
                    <View style={[styles.stageDot, progress > 0.33 && styles.stageDotActive]} />
                    <View style={[styles.stageDot, progress > 0.66 && styles.stageDotActive]} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.mainLabel}>{t('bigRedButton.help')}</Text>
                  <Text style={styles.subLabel}>{t('bigRedButton.holdSeconds')}</Text>
                </>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <View style={styles.messageContainer}>
        <Text style={[
          styles.messageMain,
          isActivated && styles.messageSuccess,
          isHolding && progress > 0.66 && styles.messageHighlight,
        ]}>
          {isActivated ? t('bigRedButton.sending') : disabled ? t('bigRedButton.cooldownActive') : t(stage.messageKey)}
        </Text>
        <Text style={styles.messageSub}>
          {isActivated ? t('bigRedButton.helpOnTheWay') : disabled ? t('bigRedButton.cooldownWait') : t(stage.subKey)}
        </Text>
      </View>

      {isHolding && !isActivated && (
        <Text style={styles.cancelHint}>{t('bigRedButton.releaseToCancel')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  screenFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  ambientGlow: {
    position: 'absolute',
    width: BUTTON_SIZE * 2.2,
    height: BUTTON_SIZE * 2.2,
    borderRadius: BUTTON_SIZE * 1.1,
  },
  burstRing: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.confirmed,
  },
  rippleRing: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.ringActive,
  },
  progressRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    shadowColor: colors.ready,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  pressable: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerPulseGlow: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: BUTTON_SIZE * 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  mainLabel: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 4,
  },
  countdown: {
    color: colors.textPrimary,
    fontSize: 72,
    fontWeight: '200',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  stageIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stageDotActive: {
    backgroundColor: colors.textPrimary,
  },
  messageContainer: {
    marginTop: 48,
    alignItems: 'center',
  },
  messageMain: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  messageHighlight: {
    color: '#D4913B',
  },
  messageSuccess: {
    color: colors.confirmed,
  },
  messageSub: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '400',
    marginTop: 6,
  },
  cancelHint: {
    position: 'absolute',
    bottom: 60,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  successContent: {
    alignItems: 'center',
  },
  checkmark: {
    color: colors.textPrimary,
    fontSize: 64,
    fontWeight: '300',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sentLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 4,
  },
});
