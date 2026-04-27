# Lumeris — Teknik temel ve Faz 0 kararları

Bu belge [app_prd.md](../app_prd.md) ve geliştirme planı ile uyumlu üretim kararlarını sabitler. Plan dosyası değiştirilmez; güncellemeler burada yapılır.

## 1. Platform ve yığın

| Karar | Seçim | Gerekçe |
|-------|--------|---------|
| MVP istemci | **Expo (React Native) + TypeScript** | Windows geliştirme ortamında Android emülatör/cihaz ile çalışır; tek kod tabanı. |
| GPU görüntü | **@shopify/react-native-skia** | Metal/OpenGL üzerinde donanım hızlandırmalı çizim; ColorMatrix, RuntimeEffect (SkSL) ile LUT benzeri ve HSL geçişi. |
| PRD’deki “iOS Core Image” alternatifi | **Skia** ile eşdeğer hedef; üretimde iOS’ta Metal, Android’de OpenGL/Vulkan | Aynı PRD maddeleri karşılanır; native Swift ayrı repo olarak ileride eklenebilir. |

## 2. Görüntü boru hattı

- **Önizleme:** `useImage(uri)` ile tam URI; Canvas’ta `contain` ile sığdırma. Çok büyük görsellerde bellek riski için export öncesi cihaz testinde `expo-image-manipulator` ile uzun kenar sınırı (ör. 4096) eklenebilir.
- **Yön (EXIF):** Seçilen `ImagePicker` / `MediaLibrary` URI’leri işletim sisteminin döndürdüğü yöneltilmiş piksel düzenine güvenir; ek rotasyon PRD sonrası iyileştirme.
- **Format:** HEIC/HEIF kaynaklar platform tarafından decode edilir; export’ta **PNG veya JPEG** (`makeImageSnapshot` + `encodeToBytes`).
- **Renk:** sRGB varsayımı; geniş gamut monitörlerde küçük sapma kabulü (V1.1’de ICC politikası).

## 3. LUT ve grain lisansı

- **15 “analog” ön ayar:** Şu an **ColorMatrix + yoğunluk (0–100)** ile simüle edilir; gerçek `.cube` 3B LUT dokuları için varlık klasörü ve SkSL örnekleme sonraki iterasyonda eklenecek.
- **Grain:** SkSL içinde prosedürel gürültü + yoğunluk üniformu; harici doku dosyası kullanılmadığı için **üçüncü parti doku lisansı gerekmez**. Üretimde film grain dokusu eklenecekse [mobile/assets/README.md](../mobile/assets/README.md) bölümündeki lisans kontrol listesi uygulanır.

## 4. Gizlilik ve veri

- **Zero-server:** Ağ çağrısı yok; KPI zaman damgaları yalnızca cihazda `FileSystem.documentDirectory` altında saklanır (isteğe bağlı silinebilir).
- **Analitik:** Üçüncü parti SDK yok; mağaza konsolu metrikleri önerilir.

## 5. Mağaza hazırlığı (özet)

- Expo `plugins` ile fotoğraf ve medya kitaplığı izin metinleri (Türkçe).
- Gizlilik politikası taslağı: [PRIVACY.md](PRIVACY.md).

## 6. Bilinen sınırlamalar (MVP)

- **Keskinlik (sharpness):** Skia ColorMatrix ile tam unsharp mask yok; slider arayüzde yer tutar, değer şimdilik görüntüye uygulanmayabilir veya sonraki sürümde kernel ile eklenir.
- **EXIF tam koruma:** `saveToLibraryAsync` ile kayıt platforma bağlıdır; tüm EXIF alanlarının %100 korunması için native modül veya `expo-media-library` gelişmiş API araştırması gerekir — hedef: mümkün olan en iyi koruma + kullanıcı bilgilendirmesi.
