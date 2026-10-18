module.exports = {
  expo: {
    name: "Holy",
    slug: "holy",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0B1D33",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      storageMode:
        process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development"
          ? "supabase"
          : "local",
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "",
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "",
    },
  },
};
