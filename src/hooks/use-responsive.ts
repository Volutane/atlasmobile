import { useWindowDimensions } from 'react-native';
import { MaxContentWidth, MaxContentWidthTablet, TabletBreakpoint } from '@/constants/theme';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  isDesktop: boolean;
  contentMaxWidth: number;
  numColumns: number;
  gridGap: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 600;
  const isTablet = width >= 600;
  const isLandscape = width > height;
  const isDesktop = width >= 1024;

  const contentMaxWidth = isTablet ? MaxContentWidthTablet : MaxContentWidth;
  const numColumns = isTablet ? (width >= 1100 ? 3 : 2) : 1;
  const gridGap = isTablet ? 16 : 12;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isLandscape,
    isDesktop,
    contentMaxWidth,
    numColumns,
    gridGap,
  };
}
