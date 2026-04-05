# Khidmat App (خدمات)

A service worker finder app for Iraqi cities with multi-language and dark mode support. Built with React, Vite, Tailwind CSS, and Firebase.

## Project Structure

- `src/`: Contains all the React source code.
  - `App.tsx`: Main application logic and routing.
  - `firebase.ts`: Firebase initialization and configuration.
  - `i18n.ts`: Internationalization setup (English and Arabic).
  - `types.ts`: TypeScript interfaces and types.
  - `seed.ts`: Script to seed initial mock data for testing.
- `android/`: Capacitor Android project for building the APK.
- `dist/`: This folder will be created after running `npm run build`. It contains the production-ready website files.
- `capacitor.config.ts`: Capacitor configuration.
- `package.json`: Project dependencies and scripts.

## Prerequisites

- Node.js (v18 or higher)
- npm
- Android Studio (for building the APK)

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the Web Project:**
   ```bash
   npm run build
   ```
   This will generate the `dist/` folder.

3. **Sync with Capacitor:**
   ```bash
   npx cap sync
   ```

4. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```
   From Android Studio, you can build the signed APK or run the app on an emulator/device.

## Firebase Setup

This project uses Firebase for Authentication and Firestore. 
The configuration is stored in `firebase-applet-config.json`. 

If you are setting this up for the first time:
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Enable **Authentication** (Google Provider).
3. Enable **Firestore Database**.
4. Add a Web App to your Firebase project and copy the configuration values into `firebase-applet-config.json`.

## Scripts

- `npm run dev`: Start the local development server.
- `npm run build`: Build the project for production (output to `dist/`).
- `npm run cap:sync`: Sync the web build with the Android project.
- `npm run cap:open`: Open the project in Android Studio.
- `npm run cap:build`: Build and sync in one command.
