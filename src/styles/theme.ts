import { useColorScheme } from 'react-native';

// Color palette
const colors = {
    light: {
        background: '#FFFFFF',
        surface: '#F8F8F8',
        surfaceAlt: '#F0F0F0',
        text: '#000000',
        textSecondary: '#666666',
        textTertiary: '#999999',
        border: '#E0E0E0',
        primary: '#1DB954',
        primaryDark: '#1AA34A',
    },
    dark: {
        background: '#000000',
        surface: '#1A1A1A',
        surfaceAlt: '#2A2A2A',
        text: '#FFFFFF',
        textSecondary: '#B3B3B3',
        textTertiary: '#808080',
        border: '#333333',
        primary: '#1DB954',
        primaryDark: '#1AA34A',
    },
};

// Typography (same for both themes)
const typography = {
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        lineHeight: 40,
    },
    h2: {
        fontSize: 24,
        fontWeight: '600' as const,
        lineHeight: 32,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    small: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
};

// Spacing
const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Border radius
const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
};

// Shadows (minimal, subtle)
const shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
};

// Hook to use the theme based on device color scheme
export function useTheme() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return {
        colors: isDark ? colors.dark : colors.light,
        typography,
        spacing,
        borderRadius,
        shadows,
        isDark,
    };
}

// Export default theme for compatibility
export const theme = {
    colors: colors.dark, // Default to dark for now
    typography,
    spacing,
    borderRadius,
    shadows,
};
