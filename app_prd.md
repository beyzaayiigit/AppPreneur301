# PRD: Lumeris v1.0 (MVP)

**Durum:** Taslak / İncelemede  
**Sürüm:** 1.0  
**Temel Odak:** On-device Analog Fotoğraf Editörü

---

## 1. Ürün Vizyonu ve Hedefler
PureGrain, mobil fotoğrafçılıkta "karmaşayı" ortadan kaldırmayı hedefler. Kullanıcıyı hesap açma veya ödeme duvarlarıyla yormadan, profesyonel kalitede analog dokusunu ve HSL kontrolünü cihaz üzerinde (on-device) sunar.

* **Stratejik Hedef:** 18-25 yaş arası görsel estetik odaklı kitlenin "go-to" hızlı düzenleme aracı olmak.
* **Değer Önerisi:** Sıfır kayıt, maksimum hız, yüksek kaliteli grain ve renk kontrolü.

---

## 2. Kullanıcı Hikayeleri (User Stories)
* **Giriş:** Bir kullanıcı olarak, uygulamayı açtığımda hiçbir form doldurmadan doğrudan galerimi görüp düzenlemeye başlamak istiyorum.
* **Düzenleme:** Bir mobil fotoğrafçı olarak, GPU gücünü kullanan akıcı bir arayüzle fotoğrafıma gerçekçi film kumlanması (grain) ve renk tonu (HSL) ayarı yapmak istiyorum.
* **Gizlilik:** Verilerine hassas bir birey olarak, fotoğraflarımın hiçbir sunucuya yüklenmediğinden emin olmak istiyorum.

---

## 3. Fonksiyonel Gereksinimler (Functional Requirements)

### 3.1. Medya Erişimi ve Galeri Yönetimi
* **FR1:** Uygulama açılışında sistem galerisine erişim izni istenecek. İzin verildikten sonra fotoğraflar "Son Eklenenler" sırasıyla listelenecek.
* **FR2:** iCloud (iOS) veya Google Photos (Android) üzerinden sadece seçilen görselin lokal belleğe çekilmesi sağlanacak.

### 3.2. GPU Tabanlı Düzenleme Motoru (Core Engine)
* **FR3 (LUT Engine):** 15 adet önceden tanımlanmış .cube veya benzeri formatta analog filtre desteği. Filtre yoğunluğu 0-100 arası ayarlanabilir olmalı.
* **FR4 (Grain Engine):** Pro-grade kumlanma efekti. Statik bir görsel bindirme yerine, fotoğrafın çözünürlüğüne göre ölçeklenen dinamik bir "overlay" motoru kullanılmalı.
* **FR5 (HSL Paneli):** Kırmızı, Turuncu, Sarı, Yeşil, Aqua, Mavi, Mor, Magenta renkleri için;
    * **Hue (Ton):** -100 / +100
    * **Saturation (Doygunluk):** -100 / +100
    * **Luminance (Parlaklık):** -100 / +100
* **FR6 (Temel Araçlar):** Pozlama, Kontrast, Sıcaklık, Keskinlik, Solma (Fade) ve Vignette sliderları.

### 3.3. Etkileşim ve Kayıt
* **FR7 (Export):** Orijinal dosya boyutunu ve metadata (EXIF) verilerini koruyarak galeriye kayıt.
* **FR8 (Compare):** Düzenleme sırasında ekrana basılı tutulduğunda "öncesi/sonrası" (before/after) görünümü.

---

## 4. Teknik Gereksinimler (Technical Constraints)

### 4.1. Mimari ve Performans
* **On-Device Processing:** Görüntü işleme kütüphaneleri (iOS için Core Image/Metal, Cross-platform için GPU-accelerated shaders) kullanılmalıdır. CPU kullanımı minimize edilmeli, tüm işlemler GPU üzerinde yürümelidir.
* **Offline-First:** Uygulamanın çalışması için aktif bir internet bağlantısı gerekmemelidir.
* **Zero-Server Policy:** Hiçbir kullanıcı verisi, fotoğraf veya işlem kaydı dış sunucuya aktarılmamalıdır.

### 4.2. UI/UX Spesifikasyonları
* **Renk Paleti:** Ana tema "Lilac & Soft Gray" (Örn: #E6E6FA lila tonları).
* **Tipografi:** Modern, sans-serif, okunaklı font ailesi.
* **Haptic Feedback:** Slider hareketlerinde ve buton etkileşimlerinde hafif dokunsal geri bildirim.

---

## 5. Başarı Metrikleri (KPIs)
* **Time-to-First-Edit:** Uygulama ikonuna dokunuş ile ilk filtre uygulaması arasındaki sürenin 3 saniyenin altında olması.
* **Daily Active Users (DAU) / Session Length:** Kullanıcıların uygulamada geçirdiği ortalama süre ve geri dönüş sıklığı.
* **Crash-Free Session Rate:** GPU tabanlı işlemlerin stabilitesi (Hedef: %99.9).

---

## 6. Yol Haritası (Gelecek Fazlar)
* **V1.1:** Kullanıcının kendi "Preset"lerini (ayar setleri) oluşturup kaydetme özelliği.
* **V1.2:** Analog çerçeve (film frames) ve tarih damgası (date stamp) seçenekleri.
* **V2.0:** Batch Processing (Birden fazla fotoğrafı aynı anda düzenleme).
* **Wildcard Deneyi:** Fotoğrafın renk paletine göre otomatik ambient müzik önerisi (Opsiyonel etkileşim).