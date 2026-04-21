# 📄 MVP KAPSAM DOKÜMANI (Product Scope Document)

**Ürün Adı:** [Geçici: Lumeris]  
**Versiyon:** 1.0 (MVP)  
**Hedef Kitle:** 18-25 yaş, estetik odaklı, abonelik yorgunu mobil fotoğrafçılar.  
**Temel Motto:** "Kayıt yok, reklam yok, sadece saf analog."

---

## 1. ÜRÜNÜN AMACI VE DEĞER ÖNERİSİ
Piyasadaki karmaşık, abonelik odaklı ve kullanıcıyı kayıt olmaya zorlayan fotoğraf editörlerine karşı; hızlı, "on-device" çalışan ve temel profesyonel araçları (HSL, Grain) ücretsiz sunan minimalist bir alternatif oluşturmak.

## 2. KULLANICI DENEYİMİ (UX) İLKELERİ
* **Zero-Friction (Sıfır Sürtünme):** Uygulama açıldığında kullanıcıyı estetik bir karşılama ekranı karşılar; alt bölümde galeriden küçük önizlemeler bulunur ve tek bir “Düzenlemeye Başla” aksiyonu ile editöre hızlı geçiş sağlanır.
* **On-Device:** Tüm işlemler cihazda yapılır, bulut yüklemesi ve bekletme yoktur.
* **Minimalist UI:** Lila ve soft tonlarda, dikkati fotoğrafa veren sade arayüz.

## 3. MVP ÖZELLİK SETİ (Must-to-Have)

### A. Giriş ve Dosya Yönetimi
* **Estetik Karşılama:** Splash screen sonrası minimal ve görsel olarak güçlü bir karşılama ekranı gösterilir. Bu ekranda:
Galeriden seçilmiş küçük önizleme görselleri (thumbnail strip)
Tek bir ana aksiyon: “Düzenlemeye Başla”
bulunur. Kullanıcı tek dokunuşla editöre veya galeriye geçer.
* **No-Login:** Kullanıcı hesabı, e-posta veya şifre zorunluluğu yok.

### B. Düzenleme Motoru (GPU Tabanlı)
* **15 İkonik Analog Filtre (LUT):** Seçilmiş, yüksek kaliteli analog film simülasyonları.
* **Manuel İnce Ayar Kontrolleri:** Kullanıcılar hazır filtreler üzerine veya bağımsız olarak:
"Pozlama"
"Kontrast"
"Doygunluk"
"Sıcaklık"
"Keskinlik"
gibi temel ışık ve renk ayarlarını özgürce düzenleyebilir.
* **Profesyonel Grain Motoru:** Şeffaf katman (overlay) yöntemiyle gerçekçi kumlanma efekti.
* **Demokratik HSL Paneli:** 8 ana renk için Ton, Doygunluk ve Parlaklık kontrolü.
* **Analog Araçlar:** Fade (Solma), Vignette (Kenar karartma) ve Sıcaklık ayarları.
* **Temel Ayarlar:** Pozlama, Kontrast, Doygunluk ve Keskinlik.

### C. Etkileşim ve Kayıt
* **Bas-Karşılaştır:** Orijinal görselle anlık farkı görme mekanizması.
* **Hızlı Export:** Metadata verilerini koruyarak kayıpsız JPG/PNG kaydı.

## 4. TEKNİK GEREKSİNİMLER
* **Platform:** iOS (Swift/Core Image) veya Cross-platform (Flutter/React Native + GPU kütüphaneleri).
* **İşleme:** Tamamen cihaz üzerinde (Offline-first).
* **Depolama:** Fotoğraflar sunucuda tutulmaz, sadece yerel önbellek kullanılır.

## 5. BAŞARI METRİKLERİ (KPIs)
* **Time-to-Edit:** Uygulama açılışından ilk fotoğrafa efekt uygulama süresi (< 3 saniye).
* **Retention Rate:** Uygulamanın silinme oranı (Abonelik istemediği için rakiplerden düşük olması beklenir).
* **Virality Coefficient:** QR kod veya sosyal medya paylaşımı ile gelen yeni kullanıcı sayısı.

## 6. DIŞARIDA BIRAKILANLAR (Out of Scope - Gelecek Versiyonlar)
* Video düzenleme.
* Bulut yedekleme.
* Topluluk/Sosyal akış özellikleri.
* Yapay zeka tabanlı nesne silme.