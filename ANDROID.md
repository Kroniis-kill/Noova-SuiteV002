# Noova Suite en Android (Capacitor)

Requisitos en tu PC: Node 18+, Android Studio (con SDK) y JDK 17.

1. `npm install`
2. `npm run android:sync`   (compila la web y la copia al proyecto Android)
3. `npm run android:open`   (abre Android Studio)
4. En Android Studio: Run ▶ (emulador o celular con depuración USB).

APK/AAB para publicar: Build > Generate Signed Bundle / APK.
Cada vez que cambies código web: `npm run android:sync` otra vez.

Notas:
- appId: `com.noova.suite` (cámbialo en capacitor.config.ts ANTES de publicar en Play Store).
- OneSignal push nativo: hay que agregar `google-services.json` de Firebase en `android/app/`
  y configurar el FCM en el panel de OneSignal.
- El service worker se desactiva en la app nativa.
