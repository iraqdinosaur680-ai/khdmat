import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khdmat.app',
  appName: 'Khdmat',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
      google: {
        webClientId: "420174503383-ng18hjfhv6d0clq7c86g0v0s9iq7isad.apps.googleusercontent.com",
      },
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "420174503383-ng18hjfhv6d0clq7c86g0v0s9iq7isad.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
