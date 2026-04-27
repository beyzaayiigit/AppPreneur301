# Lumeris (MVP)

Expo + React Native + [React Native Skia](https://shopify.github.io/react-native-skia/) ile on-device fotoğraf düzenleme. Ağ çağrısı yok.

## Çalıştığını doğrulama 

Uygulama açılır açılmaz **karşılama ekranı** gelir. Bu ekranda:

- **Lumeris** başlığı ve motto
- **“Uygulama çalışıyor”** kutusu: on-device MVP, Expo ve **sürüm numarası** (`app.json` ile aynı)
- (İzin verildiyse) galeri önizleme şeridi ve **Düzenlemeye Başla**

Yani ek bir sunucu veya backend olmadan, ilk ekran projenin cihazda çalıştığının doğrudan kanıtıdır. İsterseniz bu ekranın ekran görüntüsünü repoya ekleyerek GitHub üzerinden de paylaşabilirsiniz (ör. `docs/screenshots/welcome.png`).

## Çalıştırma

```bash
cd mobile
npm install
npx expo start
```

Android emülatör veya fiziksel cihaz önerilir. **Web** hedefi Skia ile sınırlıdır; mobil kullanın.

## Özellik özeti

- Karşılama, son fotoğraf önizlemeleri, galeriden seçim
- 15 analog ön ayar + yoğunluk, temel slider’lar, 8×3 HSL, grain / vignette / fade (SkSL)
- Basılı tutunca karşılaştırma, geri al / yinele, JPEG olarak galeriye kayıt
- Cihaz içi KPI zaman damgası (`expo-file-system/legacy`)

Teknik kararlar: [../docs/TECH_FOUNDATION.md](../docs/TECH_FOUNDATION.md)

## Sorun giderme

- **`react-native-reanimated is not installed` (kırmızı ekran):** `react-native-worklets` bağımlılığı `package.json`’da olmalı; `index.ts` en üstte `import 'react-native-reanimated'` içermeli. Babel’de **yalnızca** `react-native-reanimated/plugin` kullanın (bu eklenti worklets’i zaten içerir; `worklets/plugin` ayrıca eklemeyin — “Duplicate plugin” hatası verir).
- Değişiklikten sonra: `npx expo start -c`, Expo Go’yu kapatıp yeniden açın.
