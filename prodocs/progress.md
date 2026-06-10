# Lumeris — proje ilerleme günlüğü

Bu dosya, `app_preneur_301` deposunda bugüne kadar yapılan işleri özetler; bağlam kaybını önlemek için yazılmıştır. Ürün adı çalışma olarak **Lumeris**; PRD/MVP belgelerinde geçen on-device analog fotoğraf editörü MVP’sidir.

---

## 1. Ürün hedefi (kısa)

- **Kim:** 18–25, estetik odaklı, abonelik yorgunu mobil fotoğrafçılar.
- **Ne:** Kayıt zorunluluğu ve reklam olmadan, **tamamen cihazda** çalışan analog tarzı düzenleme (LUT benzeri ön ayarlar, temel slider’lar, HSL, grain, vignette, fade).
- **Gizlilik / teknik:** Fotoğraflar sunucuya gönderilmez (**zero-server**). İnternet şart değil (offline-first hedefiyle uyumlu istemci tasarımı).

Kaynak gereksinimler: [app_prd.md](app_prd.md), [app_mvp_kapsam.md](app_mvp_kapsam.md).

---

## 2. Backend durumu

- **Şu an ayrı bir backend yok** (FastAPI, Node API vb. yok).
- Galeriden seçim, düzenleme ve galeriye kayıt **yerel işlemler**; sunucu indirme/yükleme gerektirmez.
- İleride bulut, hesap veya imzalı URL ile medya gerekiyorsa backend ayrı tasarlanır; mevcut kodda buna özel bir API katmanı iskeleti **bilinçli olarak eklenmedi** (MVP sade tutuldu).

---

## 3. Teknoloji seçimi (istemci)

| Alan | Seçim | Not |
|------|--------|-----|
| Çerçeve | **Expo SDK 54** + **React Native** + **TypeScript** | Windows’ta geliştirme için uygun; mobil odak. |
| Görüntü (GPU) | **@shopify/react-native-skia** | ColorMatrix + tek bir **SkSL RuntimeEffect** ile temel matris, 8 bölge HSL, vignette, fade, grain. |
| Medya | `expo-image-picker`, `expo-media-library` | İzin metinleri `app.json` plugin’lerinde Türkçe. |
| Etkileşim | `react-native-gesture-handler`, `react-native-reanimated`, `@react-native-community/slider` | |
| Kalıcı KPI (cihaz içi) | `expo-file-system/legacy` | Yeni `expo-file-system` API’si yerine legacy sabit yollar (`documentDirectory`, `cacheDirectory`, `EncodingType`). |

Detaylı gerekçe ve pipeline notları: [docs/TECH_FOUNDATION.md](docs/TECH_FOUNDATION.md).

---

## 4. Depo yapısı (özet)

```
app_preneur_301/
├── app_prd.md                 # PRD (FR1 yazım düzeltmesi yapıldı: "Uygulama...")
├── app_mvp_kapsam.md          # MVP kapsam
├── progress.md                # Bu dosya
├── docs/
│   ├── TECH_FOUNDATION.md     # Faz 0 teknik kararlar
│   ├── PRIVACY.md             # Gizlilik taslağı (mağaza formları için)
│   └── STORE_READINESS.md     # iOS/Android checklist
└── lumeris/                   # Expo uygulaması
    ├── App.tsx
    ├── app.json               # Splash #E6E6FA, izin plugin’leri
    ├── babel.config.js        # reanimated/plugin
    ├── index.ts               # Önce 'react-native-gesture-handler'
    ├── README.md
    ├── assets/README.md       # LUT/grain lisans notları
    └── src/
        ├── theme/colors.ts
        ├── lib/kpi.ts
        ├── hooks/useUndoableEditState.ts
        ├── engine/
        │   ├── editState.ts
        │   ├── presets.ts      # 15 ön ayar (ColorMatrix; .cube sonraki adım)
        │   ├── colorMatrix.ts
        │   └── fullPipelineEffect.ts  # SkSL + uniform üretimi
        ├── components/
        │   ├── EditorCanvas.tsx
        │   └── SliderRow.tsx
        └── screens/
            ├── WelcomeScreen.tsx
            └── EditorScreen.tsx
```

---

## 5. Uygulanan özellikler (plan fazlarıyla uyumlu)

### Faz 0 — Teknik temel

- [docs/TECH_FOUNDATION.md](docs/TECH_FOUNDATION.md): platform (Expo/RN/Skia), görüntü hattı varsayımları, LUT/grain lisans notu, zero-server, EXIF uyarısı.
- [docs/PRIVACY.md](docs/PRIVACY.md), [docs/STORE_READINESS.md](docs/STORE_READINESS.md), [lumeris/assets/README.md](lumeris/assets/README.md).

### Faz 1 — Kabuk ve medya

- Splash rengi ve tema: lila (`#E6E6FA`) [lumeris/app.json](lumeris/app.json).
- **WelcomeScreen:** başlık, son fotoğraflardan yatay önizleme (`MediaLibrary`), izin reddi / Ayarlar, sınırlı erişim bilgisi, **Düzenlemeye Başla** → `ImagePicker` ile görsel seçimi.

### Faz 2 — Düzenleme çekirdeği

- **15 isimli ön ayar** ([src/engine/presets.ts](lumeris/src/engine/presets.ts)): kimlik ile hedef matris arasında yoğunluk karışımı; gerçek `.cube` LUT henüz yok (dokümante edildi).
- **Temel ayarlar:** pozlama, kontrast, doygunluk, sıcaklık (+ preset yoğunluğu) [colorMatrix.ts](lumeris/src/engine/colorMatrix.ts) içinde birleşik matrise dönüyor.
- **HSL:** 8 renk bandı; SkSL içinde hue ağırlıkları ile `dh/ds/dl` uygulanıyor [fullPipelineEffect.ts](lumeris/src/engine/fullPipelineEffect.ts).
- **Grain, vignette, fade:** aynı SkSL geçişinde.
- `RuntimeEffect.Make` başarısız olursa **yedek:** yalnızca `Image` + `ColorMatrix` ([EditorCanvas.tsx](lumeris/src/components/EditorCanvas.tsx)).

### Faz 3 — Etkileşim, export, geri al

- **Karşılaştırma:** önizleme alanında basılı tutunca orijinal görüntü (compare modu).
- **Geri al / yinele:** jest başında anlık kopya, kaydırmada `useUndoableEditState`; preset değişiminde `commitReplace`.
- **Export:** `Canvas` snapshot → JPEG base64 → `FileSystem` (cache) → `MediaLibrary.saveToLibraryAsync`. EXIF’in tam korunması platforma bağlı; kullanıcıya uyarı metni var.
- **Erişilebilirlik:** önemli düğme/slider’larda `accessibilityLabel` / `accessibilityRole` (temel seviye).

### Faz 4 — Operasyon / mağaza hazırlığı (dokümantasyon)

- Gizlilik özeti ve mağaza checklist [docs/](docs/) altında.
- **KPI (cihaz içi, ağ yok):** [src/lib/kpi.ts](lumeris/src/lib/kpi.ts) — uygulama açılışı ve ilk düzenleme süresi için zaman damgası; `documentDirectory` altında JSON.

---

## 6. PRD / kod tutarlılığı

- [app_prd.md](app_prd.md) **FR1** satırındaki **“ygulama” → “Uygulama”** düzeltmesi yapıldı.
- **Keskinlik:** Arayüzde slider var; Skia tarafında gerçek unsharp henüz yok ([docs/TECH_FOUNDATION.md](docs/TECH_FOUNDATION.md) “Bilinen sınırlamalar” ile uyumlu).

---

## 7. Nasıl çalıştırılır

```bash
cd lumeris
npm install
npx expo start
```

Mobil cihaz veya Android emülatör hedeflenir. Web, Skia ile sınırlıdır; geliştirme için önerilmez. Ayrıntı: [lumeris/README.md](lumeris/README.md).

---

## 8. Doğrulama

- `lumeris` dizininde `npx tsc --noEmit` başarıyla geçirildi (Expo FileSystem için **legacy** import kullanımı gerekli oldu).

---

## 9. Sonraki adımlar (öneri, henüz yapılmadı)

- Gerçek **3B LUT (.cube)** varlıkları ve SkSL’de örnekleme (veya native pipeline).
- Çok büyük görsellerde **önizleme / export çözünürlük** stratejisi ve bellek testi.
- **Keskinlik** için ayrı kernel veya native filtre.
- İstenirse: `src/api/` gibi ince bir katman ile gelecekteki backend entegrasyonuna zemin.
- Mağaza gönderimi: [docs/STORE_READINESS.md](docs/STORE_READINESS.md) maddelerinin işlenmesi.

---

## 10. Plan dosyası notu

Geliştirme planı Cursor’da ayrı bir plan dosyasında üretilmişti; kullanıcı talimatı gereği **o plan dosyası repo içinde düzenlenmedi**. Ürün yol haritası için [app_prd.md](app_prd.md) bölüm 6 (gelecek fazlar) ve bu `progress.md` birlikte kullanılabilir.

---

*Son güncelleme: proje ilerlemesinin yazıya dökülmesi (Lumeris MVP istemci + dokümantasyon).*

---

## 11. Sonraki eklemeler — demo ekranı, bağımlılık düzeltmeleri, dokümantasyon

Aşağıdaki maddeler önceki bölümlerdeki işlevsel içeriği silmeden veya değiştirmeden **eklenen** çalışmaları kayıt altına alır (inceleme / Expo çalıştırma / Babel–Metro hataları).

### 11.1. Karşılama ekranında “çalışıyor” kanıtı (içerik korunarak)

- [lumeris/src/screens/WelcomeScreen.tsx](lumeris/src/screens/WelcomeScreen.tsx): Alt başlıktan sonra **“Uygulama çalışıyor”** kutusu eklendi; `expo-constants` ile `app.json` sürümü gösteriliyor; kısa açıklama metni (cihazda yükleme doğrulaması, hoca/inceleme için).
- Bağımlılık: `expo-constants` ([lumeris/package.json](lumeris/package.json)).

### 11.2. README güncellemeleri

- [lumeris/README.md](lumeris/README.md): **Çalıştığını doğrulama** bölümü (ilk ekranda ne görüleceği, isteğe bağlı ekran görüntüsü yolu önerisi).
- **Sorun giderme:** `react-native-reanimated` / `react-native-worklets` ve Babel’de **yalnızca** `react-native-reanimated/plugin` kullanımı notu; `npx expo start -c` ve Expo Go yeniden açma hatırlatması.

### 11.3. Metro / Babel hataları ve çözümler (kayıt)

1. **`Cannot find module 'babel-preset-expo'`**  
   - `babel.config.js` zaten `babel-preset-expo` kullanıyordu; paket `package.json`’da eksikti.  
   - Çözüm: `npx expo install babel-preset-expo` ile projeye eklendi.

2. **Cihazda: `react-native-reanimated is not installed!`**  
   - Reanimated 4.x için `react-native-worklets` peer bağımlılığı gerekli.  
   - Çözüm: `npx expo install react-native-worklets`; [lumeris/index.ts](lumeris/index.ts) içinde `import 'react-native-gesture-handler'` satırından hemen sonra **`import 'react-native-reanimated'`** eklendi.

3. **Metro: `Duplicate plugin/preset detected` (worklets vs reanimated)**  
   - `react-native-reanimated/plugin` dosyası, içeride `react-native-worklets/plugin` ile aynı eklentiyi yükler; ikisini birden `babel.config.js` içine yazmak Babel’de çift eklenti hatası üretir.  
   - Çözüm: `babel.config.js` içinde **yalnızca** `'react-native-reanimated/plugin'` bırakıldı (worklets satırı kaldırıldı); `react-native-worklets` paketi `package.json`’da peer olarak kalmaya devam eder.

### 11.4. Depo yapısı notu (ek satırlar)

- [lumeris/index.ts](lumeris/index.ts): artık sırasıyla `react-native-gesture-handler`, `react-native-reanimated`, sonra `expo` kaydı.
- [lumeris/babel.config.js](lumeris/babel.config.js): tek satırlık açıklama yorumu + yalnızca `react-native-reanimated/plugin`.
- [lumeris/package.json](lumeris/package.json): `babel-preset-expo`, `expo-constants`, `react-native-worklets` (Expo’nun çözdüğü sürümle) listelenir.

### 11.5. Gizlilik / galeri (sözlü not — kod değişikliği yok)

- Sohbet kapsamında: galeri erişimi, **zero-server** mimarisiyle birlikte değerlendirildiğinde yaygın ve makul bir model; mağaza beyanları ve [docs/PRIVACY.md](docs/PRIVACY.md) ile tutarlılık vurgulandı (hukuki tavsiye niteliğinde değil).

---

*Ek kayıt: demo kutusu, README sorun giderme, babel-preset-expo, Reanimated + worklets + Babel çift eklenti düzeltmesi.*

---

## 12. Servis ayrımı güncellemesi (backend + mobile)

Bu bölüm, önceki satırları değiştirmeden yeni yapılan mimari düzenlemeyi kayıt altına alır.

### 12.1. Yapısal değişiklik özeti

- Proje yapısı iki ayrı servis görünümüne getirildi: `backend/` ve `mobile/`.
- Mobil uygulama kod tabanı `lumeris/` konumundan `mobile/` konumuna taşındı.
- Böylece tek-istemci odaklı yapıdan, ders beklentisindeki servis ayrımına geçildi.

### 12.2. Backend iskeleti (minimum)

- `backend/` FastAPI tabanlı olacak şekilde güncellendi.
- Servis dosyaları:
  - `backend/app/main.py`
  - `backend/pyproject.toml`
  - `backend/README.md`
- Başlangıç endpoint'i: `GET /health` (servis ayakta mı kontrolü için).

### 12.3. Mobile servis notu

- Mobil uygulamanın Expo kodları artık `mobile/` altındadır.
- Çalıştırma komutu proje kökünden:

```bash
cd mobile
npm install
npx expo start
```

### 12.4. Dokümantasyon hizalama

- Aşağıdaki dosyalarda `lumeris/...` yol referansları yeni yapıya göre güncellendi:
  - `plan.md`
  - `docs/TECH_FOUNDATION.md`
  - `docs/STORE_READINESS.md`

### 12.5. Doğrulama kaydı

- Backend çalıştırma doğrulaması: `cd backend && py -m uv sync && py -m uv run uvicorn app.main:app --reload --port 3001`.
- Mobile tip kontrolü: `cd mobile && npx tsc --noEmit` başarılı.
- Health kontrolü: `http://127.0.0.1:3001/health` yanıtı `status: ok`.

---

*Ek kayıt: servis ayrımı tamamlandı (backend + mobile), mobil kod tabanı `mobile/` altına taşındı, minimum backend health endpoint'i eklendi.*

---

## 13. FastAPI + uv geçişi

Bu bölüm, önceki bölümlerdeki içeriği değiştirmeden son yapılan backend dönüşümünü kayıt altına alır.

### 13.1. Backend teknoloji güncellemesi

- Backend tarafı Fastify/Node iskeletinden FastAPI/Python iskeletine geçirildi.
- Amaç: Python ekosisteminde daha rahat geliştirme ve FastAPI arayüzü (`/docs`) ile hızlı doğrulama.

### 13.2. Backend dosya değişiklikleri (özet)

- Eklendi:
  - `backend/app/main.py`
  - `backend/pyproject.toml`
  - `backend/uv.lock`
- Güncellendi:
  - `backend/README.md`
  - `backend/.gitignore`
- Kaldırıldı:
  - `backend/package.json`
  - `backend/package-lock.json`
  - `backend/tsconfig.json`
  - `backend/src/...` altındaki Fastify dosyaları

### 13.3. Çalıştırma akışı (uv)

```bash
cd backend
py -m uv sync
py -m uv run uvicorn app.main:app --host 127.0.0.1 --port 3001 --reload
```

### 13.4. Doğrulama çıktıları

- Sağlık kontrolü: `GET /health` başarılı (`status: ok`).
- FastAPI dokümantasyon arayüzü:
  - `http://127.0.0.1:3001/docs`
  - `http://127.0.0.1:3001/redoc`

### 13.5. Dokümantasyon hizalama

- Backend çalıştırma adımları `uv` akışına göre güncellendi:
  - `plan.md`
  - `progress.md` (12. bölümde backend komut satırı notu)
  - `backend/README.md`

---

*Ek kayıt: backend FastAPI + uv yapısına taşındı; `/health` ve `/docs` üzerinden doğrulama tamamlandı.*

---

## 14. UI/UX yenilemesi, izin akışı, motor sadeleştirme ve grain 

Bu bölüm, önceki numaralı bölümlerdeki metinlere **dokunulmadan**, `mobile/` istemcisinde yapılan güncel geliştirmelerin ayrıntılı kaydıdır. Çalışma dizini kökü: `app_preneur_301`; mobil kod: **`mobile/`** (eski belgelerde geçen `lumeris/` yolu ile aynı uygulama, taşıma için bkz. §12).

### 14.1. Tasarım dili ve ekranlar

- **`mobile/src/theme/colors.ts`:** Açık tema (`theme`) korundu; mockup ile uyumlu **`dark`** paleti eklendi (`#0D0B14`, lavanta vurgu `#D8C4FA`, yüzey/hazır token’lar).
- **`mobile/App.tsx`:** Kök arka plan koyu tema; `StatusBar` **`light`** (koyu kabuk için).
- **`mobile/src/screens/WelcomeScreen.tsx`:**
  - Koyu karşılama: üst bar (LUMERIS, Export), hero (`ImageBackground` + başlık/alt metin/CTA), kütüphane izin kartı, önizleme ızgarası (büyük + 2×2), “Öne çıkan araçlar” yatay kartları.
  - **Looks/Adjust alt navigasyonu kaldırıldı** (yalnızca düzenleyicide kalır).
  - Üstte görsel denge için sol **←** (ilk ekranda navigasyon yok).
- **`mobile/src/screens/EditorScreen.tsx`:**
  - Üst çubuk: geri, geri al / yinele, ortada LUMERIS, **Export** (modal açar).
  - **Looks | Adjust** yalnızca **alt LOOKS / ADJUST** çubuğu ile (üstteki pill kaldırıldı, çift kontrol giderildi).
  - **Export modal:** kalite (HD / RAW / 4K — JPEG kalitesine yansır), boyut segmentleri (şimdilik bilgilendirme + ileri adım notu), Kaydet, paylaşım satırı.
  - Karşılaştırma, snapshot ile galeriye kayıt akışı korundu.
- **`mobile/src/components/SliderRow.tsx`:** `appearance="dark"` ile koyu editör satırları; etiket + değer üst satırda.

### 14.2. Galeri izni (on-demand)

- **`WelcomeScreen`:** Açılışta **`MediaLibrary.requestPermissionsAsync` çağrılmıyor**; yalnızca **`getPermissionsAsync`** ile sessiz kontrol.
- İzin yoksa “Galeri erişimi ver” / reddedilince banner + Ayarlar / Yeniden dene.
- Expo Go kullanımda izinler **Expo Go** uygulamasına bağlıdır (sistem ayarlarından kontrol).

### 14.3. Ürün / tasarım belgesi ve git

- Repo köküne **`design_system_ux_prd.md`** eklendi (tasarım sistemi + UX PRD özeti); kullanıcı isteğiyle **`.gitignore`** içine alındı (push edilmesin).
- Önceki **`progress.md`** satırları bu kayıtta **değiştirilmedi**; yalnızca sonuna §14 eklendi.

### 14.4. Düzenleme motoru — durum modeli

- **`mobile/src/engine/editState.ts`:**
  - **`pop`** alanı eklendi (0–1): mock “Pop”; **`colorMatrix.ts`** içinde preset zincirinden sonra ek kontrast ile uygulanır.
  - **HSL tamamen kaldırıldı** (`hsl` dizisi, ilgili tipler).
- **`mobile/src/engine/colorMatrix.ts`:** `pop` sonrası hafif kontrast çarpanı; yorumlar güncellendi.
- **`mobile/src/engine/fullPipelineEffect.ts`:**
  - SkSL’den **HSL bölgeleri** çıkarıldı; pipeline: renk matrisi → vignette → fade → **grain**.
  - **`PIPELINE_VERSION`** ile RuntimeEffect önbelleği sürümlenir (shader değişince artırıldı).
- **`mobile/src/engine/presets.ts`:**
  - **`Original`** listenin başına eklendi (`PRESET_NAMES` / `PRESET_SHORT_LABELS` — ORG).
  - **`getPresetMatrix`:** `index === 0` → kimlik matrisi (ön ayar yok); diğer indeksler `RAW_PRESETS[index - 1]` ile yoğunluk karışımı.
  - **`presetThumbBackground(0)`** nötr ton.

### 14.5. Önizleme boyutu ve uzun fotoğraf

- Sabit yükseklik yerine **`Image.getSize`** ile görüntü en-boy oranı okunuyor; **`computePreviewSize`** ile `PREVIEW_MAX_W` × tab’e bağlı **`PREVIEW_MAX_H`** içinde sığdırılıyor (oran korunur, gereksiz letterbox azalır).
- **Looks** ve **Adjust** için farklı yükseklik tavanları (`PREVIEW_MAX_H_LOOKS` / `PREVIEW_MAX_H_ADJUST`); Adjust’ta panel alanı için önizleme biraz daha kısıtlı, sonrasında oranlar kullanıcı geri bildirimiyle **~%54 / ~%44** ekran yüksekliğine ayarlandı.
- Kaydırma alanı alt padding’i Adjust’ta artırıldı (slider + alt bar çakışması azaltıldı).

### 14.6. Looks — Original ve yoğunluk

- **`EditorScreen` Looks sekmesinde:** **`presetIndex === 0` (Original)** iken **INTENSITY** slider’ı **render edilmiyor** (ön ayar olmadığı için anlamsız).

### 14.7. Grain (kumlama)

- Sorunlar: normalize **uv** ile düşük frekanslı “leke”; ardından çok zayıf genlik; karmaşık çok katmanlı deneme kullanıcı tarafından beğenilmedi.
- Geçerli yaklaşım: **`floor(coord)`** ile piksel bazlı gürültü; kaba + ince ölçek karışımı; genlik için **`ga*ga*0.11 + ga*0.07`** eğrisi ve görünürlük artışı.
- **`createDefaultEditState().grain`:** varsayılan **`0`** (açılışta gren kapalı; kullanıcı slider ile açar).
- Son ayarlardan sonra **PIPELINE_VERSION** en az **7** olacak şekilde güncellendi; Expo’da tam yenileme önerilir.

### 14.8. Titreşim (haptics)

- **`SliderRow`:** `expo-haptics` ile kaydırma sırasında titreşim kaldırıldı.
- **`EditorScreen`:** sekme/preset/export başarı titreşimleri kaldırıldı.
- Not: **`expo-haptics`** paketi `package.json`’da kalabilir; kullanılmıyorsa ileride `npm uninstall expo-haptics` ile temizlenebilir.

### 14.9. Doğrulama (bu oturumla uyumlu)

- `cd mobile && npx tsc --noEmit` başarılı tutuldu (motor ve ekran değişikliklerinden sonra).

### 14.10. Özet tablo (dosya → ana etki)

| Dosya / alan | Ana değişiklik |
|--------------|----------------|
| `mobile/src/theme/colors.ts` | `dark` tema |
| `mobile/App.tsx` | Kök arka plan, StatusBar |
| `mobile/src/screens/WelcomeScreen.tsx` | Koyu karşılama, izin on-demand, Looks bar yok |
| `mobile/src/screens/EditorScreen.tsx` | Koyu editör, Looks/Adjust, Export modal, önizleme boyutu, Original’da intensity gizli |
| `mobile/src/components/SliderRow.tsx` | Dark görünüm, haptics yok |
| `mobile/src/engine/editState.ts` | `pop`, HSL kaldırıldı, grain varsayılan 0 |
| `mobile/src/engine/colorMatrix.ts` | `pop` matrisi |
| `mobile/src/engine/presets.ts` | Original, `getPresetMatrix(0)` kimlik |
| `mobile/src/engine/fullPipelineEffect.ts` | HSL’siz SkSL, grain revizyonları, PIPELINE_VERSION |
| `.gitignore` | `design_system_ux_prd.md` (opsiyonel, kullanıcı isteğine göre) |

---

*Ek kayıt (§14): koyu UI, izin akışı, Original + yoğunluk gizleme, HSL kaldırma, pop, önizleme oranı / sekme tavanları, grain yeniden tasarımı, haptics kapatma, tasarım PRD dosyası ve gitignore notu.*

---

## 15. Haftalık vitrin, tema revizyonu, galeri/Export ve layout ince ayarı

Önceki numaralı bölümlerin metnine dokunulmadan, bu bölüm sonraki geliştirme turunun **teknik** özetidir (`mobile/` + ilgili `backend/`).

### 15.1. Haftalık “ön ayar” vitrinı (backend + istemci uyumu)

- **`backend/app/weekly_preset.py`:** UTC’de 7 günlük (`604800` sn) bloklara göre katalog indeksi (Original dışı döngü).
- **`backend/app/routers/v1/experience.py`:** `/api/v1/experience` yanıtında karşılama `spotlight` alanı sabit yerine haftalık vitrin üretimi (`PRESET_NAMES` / kısa etiketler ile).
- **`mobile/src/lib/weeklyPreset.ts`:** Aynı indeks formülü (offline ile API tutarlılığı).
- **`mobile/src/data/welcomeExperience.ts`:** `createDefaultWelcomeExperience()` — canlı API yokken bile spotlight haftalık üretilir; `WelcomeScreen` ilk state bunu kullanır.

### 15.2. Tema (`dark`)

- **`mobile/src/theme/colors.ts`:** Tam nötr gri ile önceki lavanta/mor vurgunun **harman** paleti; arka plan / yüzey / border daha grafite yakın, `accent` / `accentMuted` yumuşak lavanta-gri; `silver`, `graphite` yardımcı token’lar.

### 15.3. Galeri — Expo Go (Android) ve izin granularitesi

- **`mobile/src/screens/WelcomeScreen.tsx`:** Android **Expo Go** ortamında `expo-media-library` tam foto listesi kısıtlı olduğu için önizleme ızgarası atlanır; kullanıcıya kısa açıklama + **Fotoğraf seç** (`ImagePicker`) yolu. Diğer ortamlarda `getPermissionsAsync` / `requestPermissionsAsync(false, ['photo'])` (Android 13+ foto granular).
- **`mobile/app.json`:** `expo-media-library` plugin içinde **`granularPermissions": ["photo"]`** (manifest ile JS isteği hizası).

### 15.4. Karşılama — “Kısa ipuçları” layout

- Üç ipucu kartı: yatay kaydırmalı şerit yerine **tek satırda üç eşit sütun** (`flex: 1`, `minWidth: 0` ile metin kırılımı); gövde metninde **`numberOfLines` kısıtı kaldırıldı** (kesilme azaltıldı).

### 15.5. Editör paneli — Looks yoğunluk alanı ve alt bar

- **`mobile/src/screens/EditorScreen.tsx`:**
  - **Looks** preset şeridi ve **Edit** adjust chip satırı: **yalnızca yatay `ScrollView`**; panel gövdesinde **dikey** iç scroll yok (önceki “tüm panel dikey scroll” kaldırıldı).
  - **`panelHeight`:** Yaklaşık `winH * 0.225`, **min 168 / max 236** (intensity satırının sıkışmaması için önceki tavana göre hafif artış).
  - **`looksIntensitySlot`:** `minHeight` **72 → 80**.
  - **Alt navigasyon (`bottomNav`):** `screenH - winH` tabanlı ek dolguda **üst sınır** (`+ min(max(inset,4),32)`) ve hücre / üst padding sıkılaştırması (taban–sekme arası boşluk dengesi).

### 15.6. Export — dayanıklılık ve Expo Go yedeği

- Snapshot öncesi kırpma dikdörtgeni: **`clampSnapRect`** (tamsayı boyut, önizleme sınırlarına sıkıştırma); export önizlemesi `useEffect` ile aynı mantık.
- İzin: önce **yazma** (`requestPermissionsAsync(true, …)`), gerekirse **okuma + Android `['photo']`** granular; **`granted` / `status` / `accessPrivileges === 'limited'`** ile “erişilebilir” kabulü.
- Dosya yolu: **`FileSystem.cacheDirectory ?? FileSystem.documentDirectory`** null kontrolü; JPEG base64 → `writeAsStringAsync` + `EncodingType.Base64`.
- **Expo Go + Android:** Galeri izni yoksa bile dosya üretilip **`getContentUriAsync` + `Share.share`** ile dışa aktarma (kullanıcı bilgilendirme metni).
- **Android:** `saveToLibraryAsync` başarısız olursa bir kez aynı paylaşım yedeği denenir; `expo-constants` ile `storeClient` tespiti.

### 15.7. Doğrulama

- `cd mobile && npx tsc --noEmit` bu değişiklikler sonrası da yeşil tutuldu.

---

*Ek kayıt (§15): haftalık spotlight (backend + mobile), harman tema, Expo Go Android galeri stratejesi + `granularPermissions`, ipuçları üç sütun layout, editör panel yüksekliği / alt bar padding, export izin + snapshot + paylaşım yedekleri.*
---

## 16. Export onizleme, karsilastirma, split kaldirma, panel yumusatma, preset gucu 
Onceki numarali bolumlerin metnine dokunulmadan, bu bolum sonraki kod degisikliklerinin duz ozetidir.

### 16.1. Export modal onizlemesi

- Export acikken modalda ham `imageUri`ye dusmeyi kestirmek icin: onizleme yalnizca snapshot URI (`exportPreviewUri`) ile; URI yokken `ActivityIndicator` ile bos kutu.
- `EditorScreen.tsx` icinde `ActivityIndicator` importu.

### 16.2. Adjust: basili tutunca ham goruntu

- `EditorCanvas.tsx`: karsilastirma modunda `presetBaselineState` yerine `createDefaultEditState()` (preset yok, Original/identity yolu).
- `editState.ts`: kullanilmayan `presetBaselineState` kaldirildi.
- Erisilebilirlik metni buna gore guncellendi.

### 16.3. Adjust: LIGHT / COLOR / DETAIL ikon seridi hizasi

- Kategori degisince yatay `ScrollView` eski `contentOffset` tasiyabiliyordu; `adjustToolsScrollRef` + `useLayoutEffect` ile `scrollTo({ x: 0 })`.
- Ust sheet `ScrollView` icin `nestedScrollEnabled`.
- Yatay serit: `adjustToolsScroll` (`flexGrow: 0`), `adjustToolStrip` sol/sag padding 12.

### 16.4. Looks dikey split (once/sonra) kaldirildi

- Export ve snapshot sirasinda cizgi / yarim ham goruntu sorunlari nedeniyle tamamen kaldirildi.
- `EditorScreen.tsx`: `splitNorm`, `PanResponder`, split surukleme ve tutamac UI kaldirildi.
- `EditorCanvas.tsx`: `splitPx` propu ve Skia clip + cizgi cizimi kaldirildi; tek tam pipeline veya compare modu.

### 16.5. Looks: basili tutunca karsilastirma

- Looks onizlemesi Adjust ile ayni mantik: `Pressable` + `compareBefore={compare}`, LOOK etiketi (basili degilken).
- Sekme degisince `setCompare(false)` (`setTab` icinde).

### 16.6. Panel / kart hissiyatini yumusatma

- `mobile/src/theme/colors.ts`: `borderSubtle`, `divider` tokenlari.
- `WelcomeScreen.tsx`: cogu kartta `hairlineWidth` + `borderSubtle`, hero cercevesi ve golge hafifletme, spotlight/banner icin border kaldirilip yari saydam arka plan, ipucu ve izin kartlari vb.
- `EditorScreen.tsx`: alt sheet `bgElevated`, ust cizgi `divider`, golge/elevation dusuruldu; kategori ve alt nav secili arka plan yari saydam; preset secili halka inceltildi; export segment ve paylasim noktalari ince cerceve + yumusak zemin; export modal karta ustte ince `divider`.

### 16.7. Hazir efektlerin belirginligi

- `mobile/src/engine/presets.ts`: `amp()` (1'e yakin kanal carpani sapmasini buyutur), `lift()` (kucuk matris ofsetleri icin; `amp(0.02)` hatasi duzeltildi).
- `RAW_PRESETS` degerleri guclendirildi; Pastel ic ice karisim `0.85` -> `0.94`.

### 16.8. Dogrulama

- Bu tur degisiklikler sirasinda `cd mobile && npx tsc --noEmit` basariyla gecirildi.

---

*Ek kayit (16): export modal onizleme, adjust ham karsilastirma, adjust yatay serit scroll sifirlama, Looks split kaldirma, Looks basili tut karsilastirma, borderSubtle/divider ile panel yumusatma, preset matris guclendirme.*

---

## 17. İstemci dizin adı: `mobile/` → `frontend/`

- Repo kökünde Expo istemci klasörü **`frontend/`** olarak yeniden adlandırıldı (`git mv`).
- Dokümantasyon ve backend yorumları güncellendi: `plan.md`, `backend/README.md`, `docs/TECH_FOUNDATION.md`, `docs/STORE_READINESS.md`, `backend/app/catalog.py`, `backend/app/schemas.py`, `frontend/README.md`.
- Uygulama paket adı (`lumeris` in `package.json` / `app.json`) değişmedi; yalnızca dizin adı.

```bash
cd frontend
npm install
npx expo start
```

*Ek kayıt (17): istemci dizini `frontend/`; çalıştırma ve doküman yolları buna göre hizalandı.*

---

## 18. AI pivot — Style Triad 

Önceki bölümlerin metnine dokunulmadan; backend + frontend AI entegrasyonu.

### 18.1. Backend

- `POST /api/v1/suggest-styles` — `gemini.py`, `fallback_styles.py`, `edit_recipe.py`, `style_prompt.py`
- Thumbnail-only + kullanıcı onayı; tam dosya cihazda kalır
- Deploy hazırlığı: `render.yaml`, `backend/requirements.txt`, `prodocs/DEPLOY.md`

### 18.2. Frontend

- **AI** sekmesi, `StyleTriadPanel`, `editRecipe.ts` (snake_case ↔ camelCase)
- Thumbnail 768px JPEG hazırlama; intensity blend; kalıcı onay (`aiConsentStorage`)
- `EXPO_PUBLIC_LUMERIS_API_BASE_URL` — fiziksel cihazda LAN IP gerekir (`0.0.0.0` uvicorn)

### 18.3. Dokümantasyon

- `prodocs/` altında toplama: PRD, plan, API, ARCHITECTURE, DESIGN birleşimi
- `app_prd.md` — Style Triad, hybrid gizlilik, FR9–11

### 18.4. Kararlar

- Ürün hikâyesi: **AI stil koçu** (brief LLM çekirdek şartı)
- **Style Triad:** 3 kart, tek dokunuş `EditState` apply
- **Bütçe sıfır TL:** Gemini free tier, Render free

---

*Ek kayıt (18): Style Triad backend + frontend, deploy notları, prodocs düzeni, AI pivot PRD.*

---

## 19. Editör, favoriler, karşılama metinleri 

Önceki bölümlerin metnine dokunulmadan.

### 19.1. Export

- Önizleme canvas WYSIWYG snapshot; kalite/boyut preset'leri
- `expo-image-manipulator` upscale; `expo-sharing` ile paylaşım (WhatsApp vb.)
- Export modal önizlemesi düzenlenmiş görüntüyle uyumlu

### 19.2. AI sekmesi stabilite

- Gemini retry + fallback modeller; `GeminiError` → çevrimdışı öneriler
- Sekme geçişinde panel ve öneriler korunur; `aiBaseline` + Sıfırla
- Tam `EditState` tarifi (yalnızca Looks değil); intensity blend düzeltmesi
- Reasoning metni kaydırılabilir; backend güvenli kırpma

### 19.3. Toolbar ve menü

- Geri al / Yinele: üst barda ↩ ↪ (hamburger menüde değil)
- `EditorSideMenu` — soldan kayan panel (dashboard tarzı)
- Favorilere kaydet, Favoriler listesi, Ana ekrana dön

### 19.4. Favoriler (kayıtlı tarifler)

- `lumeris_saved_recipes.json` — max 40 kayıt, tam `EditState`
- `SaveRecipeModal`, `SavedRecipesModal` — genişletilebilir tüm ayar değerleri
- Başka fotoğrafa uygula / sil

### 19.5. Karşılama ekranı

- Hero metni estetik tona (`HERO_COPY`); pazarlama dili azaltıldı
- Neden Lumeris pillar metinleri; kart genişliği / satır kırılması düzeltildi
- Haftanın ön ayarı: preset başına özel açıklama (`presetSpotlightCopy.ts`); rozet `n/15`
- Kısa ipuçları: yatay kaydırmalı kartlar; footer döngü satırı kaldırıldı

### 19.6. Backend

- `spotlight_copy.py` + `/api/v1/experience` metin güncellemesi

### 19.7. Sıradaki

- [ ] Backend canlı deploy (Render) + `EXPO_PUBLIC_LUMERIS_API_BASE_URL`
- [ ] GitHub commit (prodocs / backend / frontend ayrı)
- [ ] Canlı URL doğrulama + demo video
- [ ] Teslim 14 Haziran 23:59

---

*Ek kayıt (19): export WYSIWYG, favoriler + side menu, welcome copy, AI stabilite*

---

## 20. Canlı deploy, env ve belge hizalama

Önceki bölümlerin metnine dokunulmadan.

### 20.1. Backend — Render

- Manuel **Web Service** (Frankfurt); kök dizin: `backend`
- Build: `pip install -r requirements.txt` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Canlı URL: **`https://lumeris-api.onrender.com`** (`/health`, `/docs`, `/api/v1/suggest-styles`)
- Ortam: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`, `PUBLIC_BASE_URL`, `CORS_ALLOW_ORIGINS=*`
- `render.yaml`: Gemini **2.5**; `.idea/` → `.gitignore`

### 20.2. İstemci — API adresi

- `frontend/.env` + `.env.example`: `EXPO_PUBLIC_LUMERIS_API_BASE_URL=https://lumeris-api.onrender.com`
- `backend/.env.example`: yerel `127.0.0.1:3001` korundu; Render notu yorum satırı
- `app.json` → `extra.lumerisApiBaseUrl` aynı Render URL (fallback)

### 20.3. Ürün belgeleri (`prodocs/`)

- Orijinal `plan.md`, `app_prd.md`, `app_mvp_kapsam.md` korunarak **minimal ekleme**: Style Triad, favoriler, `frontend/` yolu, deploy notları
- `plan.md` faz durumları: tamamlananlara **(tamamlandı)** işareti

### 20.4. Vercel (web — isteğe bağlı)

- `frontend/vercel.json` + `npx expo export -p web`
- Eksik paket hatası giderildi: `react-dom`, `react-native-web`
- Skia web sınırlı; **asıl demo mobil / APK**

### 20.5. Doğrulama

- Render `/health` OK
- Yerel: `cd frontend && npx tsc --noEmit`

---

*Ek kayıt (20): Render backend canlı, env örnekleri, render.yaml/Gemini 2.5, prodocs PRD-plan güncellemesi, Vercel web bağımlılıkları.*

---

## 21. Demo APK — Android Studio (standalone)

Önceki bölümlerin metnine dokunulmadan.

### 21.1. Native proje

- `npx expo prebuild --platform android` → `frontend/android/` (gitignore’da; repoya girmez)
- `expo-build-properties`: yalnızca **`armeabi-v7a`, `arm64-v8a`** (x86 build hatası önlendi)
- `frontend/scripts/build-apk-debug.ps1` + `npm run apk:demo` (Android Studio JBR / `JAVA_HOME`)

### 21.2. Debug vs release APK

- **`app-debug.apk`:** JS bundle yok → telefonda **“Unable to load script”** (Metro / PC gerekir); demo için uygun değil
- **`app-release.apk`:** JS bundle APK içinde (`export:embed`) → **Metro gerekmez**; demo için doğru seçim
- Çıktı yolu: `frontend/android/app/build/outputs/apk/release/app-release.apk` (~51 MB)

### 21.3. Demo akışı

1. `frontend/.env` → Render URL
2. `cd frontend && npm run apk:demo` (veya Android Studio → `android/` → Build APK)
3. Eski kurulumu kaldır → release APK kur → backend ayakta iken AI + export dene

### 21.4. Sıradaki (teslim)

- [x] Backend Render deploy + env
- [x] Release APK (standalone demo)
- [ ] Demo video / ekran kaydı
- [ ] Kök `README.md` (ekran görüntüleriyle — repoda henüz yok)

---

*Ek kayıt (21): prebuild, ARM-only, release APK demo, debug APK Metro uyarısı.*

