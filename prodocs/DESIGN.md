# Lumeris · Deep Moss — Tasarım Sistemi

**Sürüm:** 1.1  
**Kaynak birleşimi:** `DESIGN.md` (token YAML), `deep_moss_design_system_detail.md`, `design_system_ux_prd.md`  
**Üretim eşlemesi:** [`frontend/src/theme/colors.ts`](../frontend/src/theme/colors.ts), [`frontend/src/theme/typography.ts`](../frontend/src/theme/typography.ts)

Bu belge editördeki **Deep Moss** temasının tek referansıdır. Üç kaynak dosya ile uyumludur; kodda kullanılan değerler aşağıdaki tablolardır.

---

## 1. Vizyon

Doğal, organik, huzurlu koyu tema. Fotoğraf önce gelir; araçlar ikinci planda. Hedef: analog/karanlık oda hissi, meditatif edit deneyimi.

**UX ilkesi:** Önce fotoğraf, sonra araçlar. Looks (preset) ile Adjust (ince ayar) zihinsel modeli ayrıdır; **AI** sekmesi Style Triad için üçüncü moddur.

---

## 2. Renk token’ları (üretim)

| Token (`dark.*`) | Hex | Kullanım |
|------------------|-----|----------|
| `canvas` | `#09100C` | Önizleme letterbox, en derin zemin |
| `bg` | `#0E1511` | Ana uygulama arka planı |
| `bgElevated` | `#161D19` | Yükseltilmiş yüzey |
| `surface` | `#1A211D` | Kart, sheet, input |
| `surfaceMuted` | `#242C27` | İkincil yüzey |
| `surfaceBright` | `#333B36` | Slider track, pasif alan |
| `border` | `#3A4D39` | Çerçeve, ayırıcı |
| `outline` | `#988F88` | İnce border |
| `text` | `#F2E9E4` | Birincil metin |
| `textMuted` | `#A8B5AD` | İkincil metin |
| `textDisabled` | `#525E57` | Pasif |
| `primary` | `#E3D5CA` | Sand — CTA, vurgu metin |
| `onPrimary` | `#0B120E` | Primary üzeri |
| `primaryContainer` | `#3E4B43` | Aktif sekme, CTA arka plan |
| `onPrimaryContainer` | `#D1E5D8` | Aktif sekme metin/ikon |
| `accentOrganic` | `#84A59D` | İkincil vurgu, Looks ikon |

**Not:** Orijinal `DESIGN.md` YAML’ında ek Material token’lar (secondary sage `#becca3` vb.) tanımlıdır; mobil editörde ağırlıklı olarak yukarıdaki `dark` paleti kullanılır.

---

## 3. Tipografi

**Font:** Manrope — `Manrope_400Regular` … `700Bold` ([`typography.ts`](../frontend/src/theme/typography.ts))

| Stil | Boyut / ağırlık | Kullanım |
|------|-----------------|----------|
| Display | 32 / Bold | Welcome başlık |
| Headline | 20–24 / Semibold | Bölüm başlığı |
| Title | 16 / Medium | Toolbar |
| Body | 13–14 / Regular | Açıklama |
| Label | 11–12 / Semibold, letter-spacing | PRESETS, STYLE TRIAD, sekmeler |
| Numeric | 11 / Medium | Slider değerleri |

---

## 4. Şekil ve spacing

- **Baz birim:** 4px  
- **Mobil gutter:** 16–20px  
- **Kart radius:** 12–14px  
- **CTA / sheet:** 12–16px üst köşe  
- **Derinlik:** Gölge yerine tonal katmanlar (`surface` → `surfaceBright`)

---

## 5. Bileşenler (uygulama)

| Bileşen | Kurallar |
|---------|----------|
| **SliderRow** | Track `surfaceBright`; dolu `primaryContainer`; thumb `accentOrganic` |
| **Alt nav** | Looks · Adjust · AI; aktif `navCellOn` + `primaryContainer` |
| **Preset kartları** | 12px radius; seçili `accentOrganic` çerçeve |
| **Style Triad kartları** | 3 sütun; seçili `accentOrganic` border |
| **Compare** | Basılı tut → orijinal; pill: LOOK / HAZIR |

---

## 6. Editör bilgi mimarisi

```
Editor
├─ Önizleme (fit, contain)
├─ Üst: geri, undo menü, export
└─ Alt sheet + sekmeler
    ├─ Looks — preset şeridi + intensity
    ├─ Adjust — Light / Color / Detail grupları
    └─ AI — Style Triad (3 öneri kartı)
```

**UX PRD ile uyum:** HSL labirenti yerine sınırlı selective color + preset odak; fit önizleme; Looks/Adjust ayrımı korunur.

---

## 7. Motion ve erişilebilirlik

| Süre | Kullanım |
|------|----------|
| ~150ms | Kontrol geri bildirimi |
| ~300ms | Sekme / sheet |

- Dokunma hedefi ≥ 44dp eşdeğeri  
- `accessibilityLabel` sekmeler ve presetlerde  
- Reduce motion: sistem ayarına saygı (ileride)

---

## 8. Orijinal token YAML (referans)

Aşağıdaki blok tasarım aracı / Figma export kaynağıdır; üretimde [`colors.ts`](../frontend/src/theme/colors.ts) önceliklidir.

```yaml
name: Deep Moss
colors:
  surface: '#0e1511'
  surface-container-lowest: '#09100c'
  surface-container: '#1a211d'
  surface-bright: '#333b36'
  outline: '#988f88'
  primary-container: '#eae1dc'  # YAML; kodda #3e4b43
typography:
  fontFamily: Manrope
rounded:
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
spacing:
  unit: 4px
  gutter: 16px
```

---

## 9. İlişkili belgeler

- Ürün: [`app_prd.md`](app_prd.md)  
- UX kapsam detayı: bu dosyanın §4–6 (eski `design_system_ux_prd.md`)  
- Teknik: [`TECH_FOUNDATION.md`](TECH_FOUNDATION.md)

*Kök dizindeki `DESIGN.md`, `deep_moss_design_system_detail.md`, `design_system_ux_prd.md` bu dosyada birleştirildi.*
