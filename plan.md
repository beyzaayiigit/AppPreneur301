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

## 3) MVP dışı (sonraki fazlar)

- Video düzenleme
- Bulut yedekleme ve hesap sistemi
- Sosyal akış / topluluk
- AI tabanlı nesne silme

## 4) Mevcut durum notu

- Şu an proje içinde çalışan uygulama `mobile/` dizininde ayrı bir Expo mobil servisi olarak bulunuyor
- Bu yapı ürün mantığı açısından tutarlı, çünkü MVP zaten zero-server olarak tasarlandı
- `backend/` ve `mobile/` dizinleri görünür şekilde ayrıldı
- Backend minimum iskelet (`/health`) ile hazır

## 5) Faz bazlı çalışma planı

## Faz 0 - Teknik temel (tamamlandi)
- Expo + React Native + TypeScript + Skia temeli kuruldu
- Dokümantasyon dosyaları oluşturuldu (`docs/TECH_FOUNDATION.md`, `docs/PRIVACY.md`, `docs/STORE_READINESS.md`)

Kısa test:
- `cd mobile`
- `npm install`
- `npx expo start`

## Faz 1 - Servis ayrımı ve başlangıç kurulumu (ilk sıradaki iş)
- Mevcut mobil uygulamayı `mobile/` adıyla konumlandır
- Ayrı bir `backend/` dizini oluştur
- Backend için minimum çalışan bir servis iskeleti kur
- Bu backend ilk aşamada fotoğraf işleme yapmak zorunda değil; amaç servis ayrımını göstermek

Kısa test:
- Repo kökünde `mobile/` ve `backend/` dizinleri görünmeli
- Her iki servisin de ayrı çalıştırma komutu olmalı

Durum:
- tamamlandı

## Faz 2 - Backend iskeleti
- `backend/` içinde ayrı servis kurulumu
- Öneri teknoloji: Node.js + TypeScript + Fastify
- Minimum endpoint: `GET /health`
- Temel env ve servis başlangıç yapısı
- README ve çalıştırma talimatları

Kısa test:
- `cd backend`
- `npm install`
- `npm run dev`
- `/health` endpoint'inin başarılı döndüğünü doğrula

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

## Faz 5 - Etkileşim ve export (kısmen tamamlandı)
- Before/after compare çalışıyor
- Undo/redo davranışı mevcut
- Export akışı mevcut; EXIF koruması platform sınırlarına bağlı

Kısa test:
- Düzenleme yap, galeriye kaydet, kaydedilen görseli aç ve kaliteyi kontrol et.

## Faz 6 - Kalite, performans, mağaza hazırlığı (sıradaki odak)
- Büyük görsellerde bellek/perf optimizasyonu
- Keskinlik filtresinin gerçeklenmesi
- Store checklist maddelerinin tamamlanması
- Gizlilik metinlerinin mağaza beyanlarıyla birebir uyumlandırılması

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
