"""Haftalık vitrin metinleri — frontend `presetSpotlightCopy.ts` ile uyumlu."""

PRESET_SPOTLIGHT_BODY: dict[int, str] = {
    1: "Siyah-beyazın yumuşak kontrastı; gölgelerde derinlik, highlight'ta nefes. Portre ve sokak için sakin bir negatif hissi.",
    2: "Ten tonlarına hafif altın; göz çevresinde sıcaklık, arka planda yumuşak düşüş. Doğal ışıkta en iyi.",
    3: "Mavi-gri gölgeler, keskin olmayan soğukluk. Şehir akşamları, sis ve beton yüzeyler için.",
    4: "Solmuş albüm sayfası gibi; düşük doygunluk ve nostaljik matlık. Eski yazılar ve anılar.",
    5: "Net siyah, temiz beyaz. Çizgi, mimari ve grafik kompozisyonlarda netlik arayanlara.",
    6: "Gün batımının son dakikaları; uzun gölgeler, bal rengi ışık. Manzara ve siluetler.",
    7: "Nemli yaprak ve toprak yeşili; gölgelerde huzur. Orman, park ve doğa çekimleri.",
    8: "Bulutlu sabah pastelı; yumuşak kenarlar, hafif pembe-mavi. Rüya gibi, hafif sahneler.",
    9: "Gürültüsüz, sade palet. Minimal kompozisyonlar ve tek renk alanları için dinginlik.",
    10: "Karanlıkta sızan magenta ve camgöbeği. Gece sokakları, tabela ışıkları, neon yansımalar.",
    11: "Kum, tuz ve soluk highlight. Sıcak gölgeler; yaz öğleden sonrası ve sahil çizgisi.",
    12: "Zamanla sararmış baskı; sepia dokunuş, yumuşak solukluk. Arşiv ve retro his.",
    13: "Alacakaranlık gökyüzü; soğuk üst tonlar. Deniz, ufuk ve geniş açı manzaralar.",
    14: "Şafak pembesi; ten ve çiçeklerde nazik sıcaklık. Yumuşak portre ve still life.",
    15: "İnce gren, düşük parlaklık; analog baskının mat yüzeyi. Film severlerin günlük tonu.",
}

WEEKLY_PRESET_COUNT = 15


def spotlight_body_for_index(index: int, fallback_title: str) -> str:
    return PRESET_SPOTLIGHT_BODY.get(
        index,
        f"{fallback_title} — Looks sekmesinde deneyin; yoğunlukla ince ayar yapın.",
    )
