export interface ThemeColor {
  hex: string;
  role: 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'border' | 'other';
  usage: number;
}

export interface ThemeFont {
  family: string;
  weights: number[];
  sizes: number[];
  usage: number;
}

export interface ThemeManifest {
  colors: ThemeColor[];
  fonts: ThemeFont[];
  spacing: {
    unit: number;
    rhythm: number[];
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
  shadows: Array<{
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    usage: number;
  }>;
  brandAssets: {
    logoUrl?: string;
    faviconUrl?: string;
    ogImageUrl?: string;
  };
  sourceUrl: string;
  extractedAt: string;
}
