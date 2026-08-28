import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const SPLASH_DELAY_MS = 2000; // Splash ekranının ekranda kalma süresi (ms)

export function AnimatedSplashOverlay() {
  const { width } = useWindowDimensions();
  const opacity = useSharedValue(1);
  const isHidden = useSharedValue(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTablet = width >= 768;
  const splashSource = isTablet
    ? require('@/assets/images/splashastablet.png')
    : require('@/assets/images/splashas.png');

  useEffect(() => {
    // Native splash gizle, sonra JS overlay'i animasyonla kapat
    timerRef.current = setTimeout(() => {
      SplashScreen.hideAsync().then(() => {
        opacity.value = withDelay(
          100,
          withTiming(0, { duration: DURATION, easing: Easing.out(Easing.ease) }, (finished) => {
            'worklet';
            if (finished) {
              isHidden.value = true;
            }
          })
        );
      });
    }, SPLASH_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    display: isHidden.value ? 'none' : 'flex',
  }));

  return (
    <Animated.View style={[styles.splashOverlay, overlayStyle]}>
      <Image style={styles.splashImage} contentFit="cover" source={splashSource} />
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
