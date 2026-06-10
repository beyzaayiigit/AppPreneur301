# Lumeris MVP Planı

Bu dosya, projedeki dağınık notları tek bir uygulama planında toplar. Amaç, hem geliştirme sırasını netleştirmek hem de GitHub üzerinden ilerlemeyi kolay takip etmektir.

## 1) Hedef ve kapsam

- Ürün: On-device analog fotoğraf editörü (Lumeris)
- Hedef kitle: 18-25 yaş, estetik odaklı mobil kullanıcılar
- MVP ilkesi: Kayıt yok, reklam yok, buluta yükleme yok
- Teknik ilke: Zero-server, offline-first, GPU ağırlıklı görsel işleme
- Akademik beklenti: mobil uygulama yapılsa bile backend ve istemci ayrı servisler/dizinler olarak konumlanmalı

## 2) MVP içinde olacaklar (must-have)

- Estetik karşılama ve galeriden hızlı seçim
- 15 analog preset + preset yoğunluğu
- Temel ayarlar: pozlama, kontrast, doygunluk, sıcaklık, keskinlik
- HSL paneli (8 renk x hue/saturation/luminance)
- Grain, vignette, fade
- Basılı tutarak before/after karşılaştırma
- Galeriye export (mümkün olan metadata korumasıyla)
- **Style Triad (AI, opt-in):** Küçük önizleme + kullanıcı onayı ile 3 stil önerisi, tek dokunuş apply
- **Kayıtlı tarifler:** Favori düzenleme ayarlarını cihazda saklama ve başka fotoğrafa uygulama

## 3) MVP dışı (sonraki fazlar)

- Video düzenleme
- Bulut yedekleme ve hesap sistemi
- Sosyal akış / topluluk
- AI tabanlı nesne silme

## 4) Mevcut durum notu

- Şu an proje içinde çalışan uygulama `frontend/` dizininde ayrı bir Expo istemci servisi olarak bulunuyor
- Bu yapı ürün mantığı açısından tutarlı, çünkü MVP zaten zero-server olarak tasarlandı
- `backend/` ve `frontend/` dizinleri görünür şekilde ayrıldı
- Backend minimum iskelet (`/health`) ile hazır; ayrıca presets, experience ve Style Triad uçları eklendi
- Ürün belgeleri repo kökünden `prodocs/` altına taşındı

## 5) Faz bazlı çalışma planı

## Faz 0 - Teknik temel (tamamlandı)
- Expo + React Native + TypeScript + Skia temeli kuruldu
- Dokümantasyon dosyaları oluşturuldu (`prodocs/TECH_FOUNDATION.md`, `prodocs/PRIVACY.md`, `prodocs/STORE_READINESS.md`)

Kısa test:
- `cd frontend`
- `npm install`
- `npx expo start`

## Faz 1 - Servis ayrımı ve başlangıç kurulumu (tamamlandı)
- Mevcut istemci uygulamasını `frontend/` adıyla konumlandır
- Ayrı bir `backend/` dizini oluştur
- Backend için minimum çalışan bir servis iskeleti kur
- Bu backend ilk aşamada fotoğraf işleme yapmak zorunda değil; amaç servis ayrımını göstermek

Kısa test:
- Repo kökünde `frontend/` ve `backend/` dizinleri görünmeli
- Her iki servisin de ayrı çalıştırma komutu olmalı

## Faz 2 - Backend iskeleti (tamamlandı)
- `backend/` içinde ayrı servis kurulumu
- Öneri teknoloji: Python + FastAPI
- Minimum endpoint: `GET /health`
- Temel env ve servis başlangıç yapısı
- README ve çalıştırma talimatları

Kısa test:
- `cd backend`
- `py -m uv sync`
- `py -m uv run uvicorn app.main:app --reload --port 3001`
- `/health` endpoint'inin başarılı döndüğünü doğrula
- `/api/v1/presets` ve `/api/v1/experience` uçları çalışıyor

## Faz 3 - Giriş ve medya (tamamlandı)
- Welcome akışı, izin yönetimi, galeriden seçim
- "Düzenlemeye Başla" ile editör akışına geçiş

Kısa test:
- Uygulamayı aç, galeri izni ver, bir görsel seç ve editör ekranının açıldığını doğrula.

## Faz 4 - Düzenleme motoru (devam ediyor)
- Presetler, temel renk matrisi, HSL, grain/vignette/fade uygulanmış durumda
- Keskinlik etkisi şu an UI seviyesinde var; gerçek filtreleme iyileştirilecek
- Gerçek 3B LUT (.cube) entegrasyonu bir sonraki adım

Kısa test:
- Aynı fotoğraf üzerinde preset yoğunluğu, HSL ve grain değişikliklerinin anlık önizlemede çalıştığını doğrula.

## Faz 5 - Etkileşim ve export (tamamlandı)
- Before/after compare çalışıyor
- Undo/redo davranışı mevcut
- Export akışı mevcut; EXIF koruması platform sınırlarına bağlı
- Export modal önizlemesi düzenlenmiş görüntüyle uyumlu (WYSIWYG snapshot)
- Paylaşım yedeği (Expo Go / izin kısıtları için)

Kısa test:
- Düzenleme yap, galeriye kaydet, kaydedilen görseli aç ve kaliteyi kontrol et.

## Faz 5b - AI Style Triad (tamamlandı)
- Backend: `POST /api/v1/suggest-styles` (Gemini + çevrimdışı fallback)
- Frontend: AI sekmesi, thumbnail hazırlama (~768px), kullanıcı onayı, tek dokunuş `EditState` apply
- Tam çözünürlük fotoğraf cihazda kalır; API'ye yalnızca opt-in küçük önizleme gider

Kısa test:
- Editörde AI sekmesini aç, onay ver, 3 stil kartından birine dokun; önizlemenin güncellendiğini doğrula.

## Faz 5c - Favoriler ve editör UX (tamamlandı)
- Kayıtlı tarifler (`lumeris_saved_recipes.json`, cihaz içi, max 40)
- Side menu: favorilere kaydet, listele, başka fotoğrafa uygula
- Karşılama metinleri ve haftalık vitrin açıklamaları güncellendi

## Faz 6 - Kalite, performans, mağaza hazırlığı (sıradaki odak)
- Büyük görsellerde bellek/perf optimizasyonu
- Keskinlik filtresinin gerçeklenmesi
- Store checklist maddelerinin tamamlanması
- Gizlilik metinlerinin mağaza beyanlarıyla birebir uyumlandırılması
- Backend canlı deploy (Render) + istemci `EXPO_PUBLIC_LUMERIS_API_BASE_URL` doğrulaması

Kısa test:
- Farklı cihazlarda açılış süresi, ilk düzenleme süresi ve crash oranlarını takip et.

## 6) Takip metrikleri

- Time-to-first-edit: hedef < 3 saniye
- Crash-free session rate: hedef %99.9
- Kullanıcı elde tutma (retention) ve silinme oranları

## 7) GitHub çalışma ritmi

Her geliştirme adımında:

1. Branch aç: `git checkout -b feature/kisa-aciklama`
2. Değişiklik yap ve test et
3. Commit at: `git commit -m "Kısa ve net mesaj"`
4. Push et: `git push -u origin feature/kisa-aciklama`
5. PR aç ve bu plandaki ilgili fazı güncelle

İlerleme günlüğü: `prodocs/progress.md`
