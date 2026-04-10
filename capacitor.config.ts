import type { CapacitorConfig } from '@capacitor/cli';

const config: any = {
  appId: 'com.khdmat.app',
  appName: 'Khdmat',
  webDir: 'dist',
  server: {
    hostname: 'gen-lang-client-0591138893.firebaseapp.com',
    androidScheme: 'https'
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com", "phone"],
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
