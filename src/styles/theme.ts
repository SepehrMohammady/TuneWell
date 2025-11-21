export const theme = {
    colors: {
        // Dark theme colors
        background: '#000000',
        surface: '#121212',
        surfaceAlt: '#1E1E1E',
        primary: '#1DB954', // Spotify green as accent
        primaryDark: '#169C46',
        text: '#FFFFFF',
        textSecondary: '#B3B3B3',
        textTertiary: '#6A6A6A',
        border: '#282828',
        error: '#FF3B30',
        success: '#34C759',

        // Additional UI colors
        overlay: 'rgba(0, 0, 0, 0.7)',
        shadow: 'rgba(0, 0, 0, 0.5)',
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    typography: {
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
    },

    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 999,
    },

    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.37,
            shadowRadius: 7.49,
            elevation: 8,
        },
    },
};

export type Theme = typeof theme;
