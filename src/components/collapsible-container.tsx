import React from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface CollapsibleContainerProps {
  expanded: boolean;
  children: React.ReactNode;
  duration?: number;
}

export function CollapsibleContainer({
  expanded,
  children,
  duration = 600,
}: CollapsibleContainerProps) {
  const measuredHeight = useSharedValue(0);
  const progress = useSharedValue(expanded ? 1 : 0);

  const handleMeasureLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - measuredHeight.value) > 1) {
      measuredHeight.value = h;
    }
  };

  React.useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration });
  }, [expanded, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    if (measuredHeight.value === 0) {
      return {
        height: expanded ? undefined : 0,
        opacity: expanded ? 1 : 0,
        overflow: 'hidden' as const,
      };
    }

    const height = interpolate(
      progress.value,
      [0, 1],
      [0, measuredHeight.value],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(progress.value, [0, 0.4, 1], [0, 0.2, 1]);
    return { height, opacity, overflow: 'hidden' as const };
  });

  return (
    <View>
      {/* GÖRÜNMEZ ÖLÇÜM KATMANI
          - Animasyondan tamamen bağımsız, hep normal genişlikte render olur.
          - pointerEvents="none" ile tıklamaları engellemiyor.
          - Ekranda görünmez ama layout hesaplanıyor, bu yüzden width doğru. */}
      <View
        style={styles.measureWrapper}
        pointerEvents="none"
        onLayout={handleMeasureLayout}
      >
        {children}
      </View>

      {/* GERÇEK, ANİMASYONLU GÖRÜNÜM
          measuredHeight bu noktada zaten dolu olduğu için
          ilk açılışta bile sıçrama/gecikme yaşanmıyor. */}
      <Animated.View style={animatedStyle}>
        <View>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  measureWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
});