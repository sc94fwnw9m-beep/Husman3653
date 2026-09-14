# Husman Lunchrestaurang – mobilapp

Färdigt Expo-projekt för iPhone och Android. Appen visar den publicerade Husman-appen och använder samma meny, beställningar, bokning och restauranginloggning.

## Testa

1. Installera Node.js och kör `npm install`.
2. Kör `npx expo start` och öppna med Expo Go.

## Skapa App Store- och Google Play-filer

1. Logga in: `npx eas login`
2. Koppla projektet: `npx eas init` (det ersätter `REPLACE_AFTER_EAS_INIT` i app.json).
3. Android AAB: `npm run build:android`
4. iPhone IPA: `npm run build:ios`

För signering behövs Apple Developer-konto och Google Play Console-konto. Ändra inte paketnamnet efter att appen har publicerats.

Restauranginloggning finns i appen under **För restaurangen**. Ägarkod: **3653**.


Build fix v1.0.4: added top-level babel-preset-expo ~54.0.12 for EAS/Metro. iOS build 5, Android versionCode 5.
