# IRIDESCENT LIQUID MORPH — Abstract Chrome Flow

Video abstrak 3D (loop 15 detik, 30 fps, 16:9): pita logam cair berlapis chrome iridesen
(cyan, violet, magenta, silver, electric blue) di latar dark navy → hitam, dengan ruang
kosong di kiri atas untuk teks iklan.

Semua dirender **real-time di browser** dengan Three.js + shader GLSL (WebGL2), tanpa CSS
palsu, tanpa tekstur, tanpa ekstensi GPU opsional. Waktu animasi deterministik, jadi frame
mana pun bisa dirender ulang persis sama, dan frame terakhir menyambung mulus ke frame pertama.

> **Status pengujian (jujur):**
> - ✅ Diuji di Chromium headless (SwiftShader/WebGL2): render semua preset, UI pratinjau di
>   viewport ponsel, uji loop di browser, render 450 frame PNG (SSAA 2×), encode H.264 dengan
>   ffmpeg, cek loop dengan ffmpeg (frame t=0 dan t=15 identik bit-per-bit), cek banding.
>   File uji: H.264 High 1920×1080, 30/1, 450 frame, 15,000 s, BT.709, tanpa audio, 95 MB.
> - ✅ Alur ekspor WebCodecs → MP4 diuji ujung-ke-ujung dengan codec **VP9** (build Chromium
>   open-source tidak punya encoder H.264).
> - ⚠️ **Belum diuji di perangkat Android sungguhan.** FPS dan dukungan encoder H.264 di ponsel
>   Anda harus dicek sendiri (panel menampilkannya).
> - ⚠️ Lolos/tidaknya review Adobe Stock **tidak bisa dijamin** oleh kode ini. Gunakan checklist
>   di bawah, lalu periksa ulang syarat resmi Adobe Stock sebelum upload.

---

## 1. Struktur folder

```
iridescent-liquid-morph/
├── index.html                  # halaman utama (import map → three lokal)
├── styles.css                  # UI pratinjau (ramah layar sentuh)
├── package.json                # skrip npm untuk render/encode (opsional, PC)
├── src/
│   ├── main.js                 # bootstrap: mode preview / capture, API window.ILM
│   ├── config/
│   │   ├── render-config.js    # spesifikasi video (1920×1080, 30 fps, 15 s) + preset kualitas
│   │   └── look.js             # art direction: bentuk, posisi pita, warna, kamera
│   ├── animation/
│   │   └── timeline.js         # waktu → fase loop (deterministik, aman untuk loop)
│   ├── geometry/
│   │   └── ribbon-geometry.js  # grid parametrik (u,v) + segitiga layar penuh
│   ├── shaders/
│   │   ├── noise.glsl.js       # simplex noise 4D (MIT) + dither, ACES, sRGB
│   │   ├── ribbon.glsl.js      # deformasi cair (vertex) + chrome iridesen (fragment)
│   │   └── background.glsl.js  # gradasi navy→hitam, glow, vignette, dither
│   ├── materials/
│   │   └── chrome-material.js  # ShaderMaterial + uniform bersama
│   ├── lighting/
│   │   └── studio-lighting.js  # animasi soft box / rotasi studio / pergeseran hue
│   ├── camera/
│   │   └── camera-rig.js       # gerak kamera sinematik periodik
│   ├── render/
│   │   ├── renderer.js         # cek kemampuan WebGL2 + pembuatan renderer
│   │   ├── liquid-scene.js     # merakit background + pita + kamera
│   │   ├── loop-test.js        # uji loop di dalam browser (bisa di Android)
│   │   └── webcodecs-export.js # ekspor MP4 H.264 di perangkat (WebCodecs)
│   └── ui/
│       └── preview-ui.js       # panel kontrol, panduan zona teks
├── tools/
│   ├── serve.mjs               # server statis tanpa dependensi (juga jalan di Termux)
│   ├── render-frames.mjs       # render PNG per frame via Playwright (PC/server)
│   ├── encode-h264.sh          # PNG → MP4 H.264 (opsional ProRes 422 HQ)
│   └── check-loop.sh           # cek identitas & sambungan loop dengan ffmpeg
└── vendor/
    ├── three/                  # three.js r185.1 (MIT) — tidak perlu internet/CDN
    └── mp4-muxer/              # mp4-muxer 5.2.2 (MIT)
```

## 2. Cara kerjanya

| Bagian | Teknik |
|---|---|
| **Geometri** | Grid (u,v) statis. Bentuk 3D dihitung tiap frame di *vertex shader*: kurva tengah (busur S + gelombang berjalan), puntiran, penampang elips pipih (pita tebal, tepi membulat), ujung meruncing seperti sulur cairan. |
| **Morph cair** | Simplex noise 4D: `noise(posisi_s, posisi_lebar, R·cos φ, R·sin φ)`. Waktu berjalan di **lingkaran**, sehingga noise kembali tepat ke keadaan awal setelah 15 detik. |
| **Normal** | *Finite differences* dari fungsi permukaan yang sama, jadi pencahayaan tetap benar walau bentuk berubah. |
| **Material** | Chrome = pantulan *environment studio analitik* (soft box persegi membulat, strip putih, kartu pantul cyan/magenta, horizon dingin). Lapisan iridesen meniru *thin film*: hue bergantung pada ketebalan film dan sudut pandang, dibatasi ke palet cyan→biru→violet→magenta. Silver saat menghadap kamera, berwarna di sudut miring. |
| **Pencahayaan** | Studio berputar perlahan, intensitas tiap lampu "bernapas" ±10–18 %, hue bergeser bolak-balik. Semua periodik. |
| **Kamera** | Lensa FOV 31°, orbit kecil + mengambang + roll halus, periodik. |
| **Output** | Tone mapping ACES → sRGB → *grain* luma deterministik ±3 level per piksel output (mencegah *banding* gradasi gelap setelah kompresi H.264). |
| **Loop** | Semua nilai animasi = fungsi `sin/cos(k·φ)` dengan `k` bilangan bulat, `φ = 2π·t/15`. Jadi t=0 dan t=15 identik secara matematis. Frame 0–449 diekspor; frame 450 = frame 0. |
| **Android** | Hanya WebGL2 inti. Tanpa float render target, tanpa tekstur, tanpa ekstensi wajib. `highp` dijamin oleh WebGL2. Kualitas: Low / Medium / High. |

Mau mengubah tampilan? Ubah `src/config/look.js` (posisi, lebar, puntiran, warna latar, kamera).
Bagian shader yang paling sering diubah: `studioEnv()` (lampu) dan `irisPalette()` (warna)
di `src/shaders/ribbon.glsl.js`.

## 3. Menjalankan dari perangkat Android

ES modules tidak bisa dibuka dari `file://`, jadi proyek harus disajikan lewat server HTTP.

### Opsi A — Termux (paling mandiri, direkomendasikan)

1. Instal **Termux** dari F-Droid atau GitHub resmi Termux. Versi Play Store sudah usang.
2. Di Termux:
   ```bash
   pkg update && pkg install git nodejs
   git clone -b ccr-030f4cc0-o2l1nq https://github.com/penguin116677/threejs-skills.git
   cd threejs-skills/examples/iridescent-liquid-morph
   node tools/serve.mjs 8080
   ```
   (Tanpa Node: `pkg install python` lalu `python -m http.server 8080`.)
3. Buka **Chrome Android**: `http://localhost:8080/`
4. Agar Android tidak mematikan server saat layar mati: `termux-wake-lock`.

### Opsi B — Server di PC, buka di ponsel

```bash
node tools/serve.mjs 8080          # di PC
```
- Pratinjau: buka `http://IP-PC:8080/` di ponsel (satu Wi-Fi).
- **Ekspor WebCodecs butuh *secure context*** (https atau `localhost`). Dengan kabel USB +
  `adb reverse tcp:8080 tcp:8080`, ponsel bisa membuka `http://localhost:8080/`, dan ekspor
  ikut berfungsi.

### Opsi C — Hosting statis https

Folder ini bisa diunggah apa adanya ke hosting statis apa pun (GitHub Pages, Netlify, dsb.).
Tidak butuh build step. Karena https, ekspor WebCodecs juga bisa dicoba.

### Pilih kualitas

| Preset | Untuk | Grid per pita | Pita | DPR maks | MSAA |
|---|---|---|---|---|---|
| `low` | ponsel kelas menengah/lama | 320×36 | 1 | 1.0 | – |
| `medium` (default) | ponsel 2020+ | 560×56 | 2 | 1.5 | ✓ |
| `high` (default mode render) | ponsel flagship / PC | 900×84 | 2 | 2.0 | ✓ |

Ganti lewat dropdown di panel atau URL `?q=low`. Angka FPS tampil di panel. Bila di bawah
~25 fps, turunkan preset. FPS pratinjau **tidak memengaruhi** hasil ekspor, karena ekspor
merender frame per frame dengan timestamp tepat.

## 4. Kontrol pratinjau

| Kontrol | Fungsi |
|---|---|
| ▶ / ❚❚, `Spasi` | putar / jeda |
| ‹ ›, `←` `→` | mundur / maju tepat 1 frame (1/30 s) |
| slider | lompat ke detik tertentu |
| **Sambungan loop** | memutar 13 s → 15 s → 0 s → 2 s berulang untuk mengamati titik sambung |
| **Panduan teks**, `G` | kotak zona teks (kiri atas) + batas aman 90 %. Hanya DOM, tidak ikut dirender |
| **Uji loop** | uji otomatis identitas & sambungan (lihat §5) |
| **PNG frame ini** | unduh frame saat ini |
| **Mode render/ekspor →** | resolusi tetap 1920×1080 + panel ekspor MP4 |
| `H` | sembunyikan panel |

Parameter URL:

| Parameter | Contoh | Arti |
|---|---|---|
| `t` | `?t=7.5` | buka dalam keadaan jeda pada detik 7,5 |
| `frame` | `?frame=224` | buka pada frame 224 (= detik 7,4667) |
| `q` | `?q=low` | preset kualitas |
| `mode` | `?mode=capture` | mode render: buffer tetap `w×h`, `preserveDrawingBuffer` |
| `w`, `h` | `&w=1920&h=1080` | ukuran output (mode capture) |
| `ssaa` | `&ssaa=2` | *supersampling*: render 2× lalu diperkecil (mode capture) |
| `ui` | `&ui=0` | tanpa UI (dipakai oleh tool render) |
| `exportCodec` | `&exportCodec=vp9` | cadangan bila tak ada encoder H.264 (lihat §6B) |

API untuk DevTools / otomasi (`window.ILM`): `renderAt(t)`, `renderFrame(n)`, `framePNG(n)`,
`timePNG(t)`, `loopTest()`, `bufferSize`, `caps`.

## 5. Pengujian animasi & loop

**Di Android (tanpa alat tambahan):**
1. Tekan **Uji loop**. Halaman merender frame kecil (480×270) ke render target 8-bit, lalu
   membandingkan piksel:
   - *Identitas*: t=0 vs t=15. Harus ≈ 0 (hasil di pengujian ini: 0,0016 dari 255) ✅
   - *Sambungan*: f449→f0 dibandingkan dengan perubahan normal antar-frame. Harus berada di
     rentang yang sama (hasil di sini, preset medium: 2,23 vs median 2,34) ✅
2. Tekan **Sambungan loop** dan amati penghitung waktu melompat dari 15 ke 0. Tidak boleh ada
   kedutan, lompatan warna, atau perubahan kecepatan.
3. Periksa frame tertentu dengan `?frame=0`, `?frame=449`, atau tombol ‹ ›.

**Di PC (setelah render PNG):**
```bash
bash tools/check-loop.sh frames
```
Hasil di pengujian ini:
```
identity  t=0 vs t=T     : PSNR inf dB      ← identik bit-per-bit
seam      f00449 → f00000 : PSNR 31.0 dB
reference f00050 → f00051 : PSNR 30.1 dB    ← sambungan ada di dalam rentang
reference f00350 → f00351 : PSNR 32.6 dB       pasangan normal = mulus
```
**Uji mata:** putar video berulang (VLC → *Repeat One*, atau `ffplay -loop 0 video.mp4`), atau
buat file 3× loop untuk ditonton:
`ffmpeg -stream_loop 2 -i video.mp4 -c copy loop3x.mp4`.

## 6. Ekspor video 1920×1080, 30 fps, 15 detik

### 6A. Jalur utama — PNG sequence + ffmpeg (PC / Mac / Linux / WSL)

Paling bisa diandalkan untuk file master: render frame-per-frame, lossless, lalu encode
dengan x264 yang kualitasnya bisa dikontrol penuh.

```bash
cd examples/iridescent-liquid-morph
npm install                      # memasang playwright
npx playwright install chromium
npm run frames                   # = node tools/render-frames.mjs --ssaa 2 --loopcheck --out frames
npm run encode                   # = bash tools/encode-h264.sh frames
npm run check-loop               # = bash tools/check-loop.sh frames
```
- `--ssaa 2`: tiap frame dirender 3840×2160 lalu diperkecil (lanczos) ke 1920×1080. Tepi pita
  tipis jadi jauh lebih halus. Disk: ±450 PNG 4K ≈ 3–4 GB sementara.
- Waktu yang terukur di pengujian ini (CPU, SwiftShader): ≈ 1,5–2 detik/frame pada 3840×2160,
  jadi ±12–15 menit, ditambah ±1,5 menit encode. Dengan GPU sungguhan tambahkan `--gpu` (lebih cepat, tapi bisa beda ±1 LSB dari
  SwiftShader).
- Render bisa dilanjutkan bila terputus: `--resume`. Hanya sebagian: `--start 0 --end 59`.
- Output `encode-h264.sh`: H.264 High, CRF 12 + `-tune grain`, `yuv420p`, BT.709 bertag,
  GOP 1 detik, `+faststart`, tanpa audio. Terukur ≈ 50 Mbit/s (≈ 95 MB / 15 s).
  **Jangan naikkan CRF** (mis. 18–23) atau hapus `-tune grain` demi file kecil. Encoder akan
  menghaluskan grain dan pita kontur (*banding*) muncul lagi di latar navy. Ini sudah diuji:
  CRF 14 tanpa `-tune grain` menghasilkan pita yang terlihat bila kontras dinaikkan.
- Master ProRes 422 HQ (opsional, ukuran besar): `PRORES=1 bash tools/encode-h264.sh frames`.

### 6B. Jalur Android saja — WebCodecs di Chrome

1. Buka `http://localhost:8080/?mode=capture` (atau tombol **Mode render/ekspor →**).
2. Panel menampilkan **"Siap: H.264 …"** jika encoder tersedia. Jika muncul ⚠️, perangkat ini
   tidak bisa (lihat di bawah).
3. Pilih bitrate (50 Mbps disarankan), tekan **Ekspor MP4 H.264**, tunggu 450 frame, lalu
   ketuk tautan untuk menyimpan.

Catatan jujur untuk jalur ini:
- Frame dirender satu per satu dengan timestamp tepat, bukan direkam dari layar. Jadi tidak ada
  frame hilang, walaupun ponselnya lambat.
- Kualitas encoder perangkat keras ponsel **bervariasi** dan sebagian mengabaikan bitrate. Matriks
  warna dan tag BT.709 bisa tidak tertulis. Untuk file yang dikirim ke Adobe Stock, sebaiknya
  encode ulang di Termux:
  ```bash
  pkg install ffmpeg
  ffmpeg -i iridescent-liquid-morph_1920x1080_30fps.mp4 \
    -c:v libx264 -preset slow -crf 12 -tune grain -profile:v high -pix_fmt yuv420p \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
    -an -movflags +faststart final_1920x1080_30fps.mp4
  ```
  Re-encode menambah satu generasi kompresi. Jalur 6A (dari PNG) tetap kualitas terbaik.
- Jika encoder H.264 tidak tersedia: `?mode=capture&exportCodec=vp9` mengekspor VP9 di dalam
  MP4. File ini **wajib** di-encode ulang ke H.264 dengan perintah ffmpeg di atas. Jangan
  upload VP9.
- Butuh memori ±100 MB untuk file 15 detik pada 50 Mbps. Tutup aplikasi lain bila memori ponsel kecil.
- Banyak encoder ponsel menghaluskan grain halus, sehingga banding bisa muncul. Periksa gradasi latar sebelum mengirim.

### Verifikasi file akhir (PC atau Termux)

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_primaries,nb_frames \
  -show_entries format=duration -of default=nw=1 final.mp4
```
Harus terbaca: `h264`, `High`, `1920`, `1080`, `30/1`, `yuv420p`, `bt709`, `nb_frames=450`,
`duration=15.000000`. Pastikan juga tidak ada stream audio.

## 7. Checklist sebelum dikirim ke Adobe Stock

> Syarat Adobe Stock bisa berubah. Cocokkan dengan halaman resmi *Adobe Stock Contributor —
> video requirements* sebelum upload. Daftar ini membantu, bukan pengganti review Adobe.

**Teknis**
- [ ] Resolusi 1920×1080 (atau lebih tinggi), rasio 16:9, piksel persegi
- [ ] 30 fps konstan, 450 frame, durasi 15,0 s (dalam batas 5–60 s)
- [ ] Codec H.264 (atau ProRes) di container MP4/MOV
- [ ] `yuv420p`, BT.709 bertag, *limited range*
- [ ] Bitrate cukup tinggi: tidak ada blok/artefak di gradasi gelap
- [ ] Tanpa stream audio (atau audio yang memang Anda punya haknya)
- [ ] Ukuran file di bawah batas Adobe Stock
- [ ] Nama file tanpa spasi/karakter aneh
- [ ] Frame pertama bukan hitam/kosong (dipakai sebagai thumbnail)

**Visual**
- [ ] Ditonton 3× berulang: sambungan loop tidak terlihat (tidak ada kedutan, lompatan warna,
      atau perubahan kecepatan)
- [ ] Tidak ada *banding* di latar navy. Cek **file akhir**, bukan PNG. Trik: ambil satu frame
      dan naikkan kontrasnya ekstrem:
      `ffmpeg -ss 8 -i final.mp4 -frames:v 1 -vf "curves=all='0/0 0.12/1'" cek.png`.
      Gradasi harus berbintik halus, bukan bergaris kontur.
- [ ] Tidak ada *aliasing*/kerlip di tepi pita yang tipis (gunakan SSAA 2 untuk master)
- [ ] Zona kiri atas tetap kosong di seluruh 15 detik. Cek dengan **Panduan teks**. (Di render
      ini ujung pita sesekali menyentuh sudut kanan-bawah zona; geser `position` di
      `look.js` bila perlu.)
- [ ] Highlight tidak terpotong putih pada area luas
- [ ] Tidak ada UI, panduan, watermark, logo, atau teks yang ikut terender
- [ ] Gerakan tetap halus di layar ponsel dan desktop

**Hukum & metadata**
- [ ] Semua kode/aset milik Anda atau berlisensi bebas: three.js (MIT), mp4-muxer (MIT),
      webgl-noise (MIT). Tidak ada aset pihak ketiga lain di dalam video.
- [ ] Judul & kata kunci deskriptif dalam bahasa Inggris, misalnya: *iridescent liquid chrome
      ribbon abstract background, seamless loop*. Kata kunci: abstract, liquid metal, chrome,
      iridescent, holographic, fluid, ribbon, 3D, loop, seamless, background, futuristic,
      technology, beauty, cyan, magenta, violet, dark, copy space, motion graphics.
- [ ] Sebutkan "seamless loop" hanya jika sudah Anda verifikasi sendiri (lihat §5).
- [ ] **Pelabelan AI:** kode proyek ini ditulis dengan bantuan AI, sedangkan videonya dirender
      secara prosedural (tanpa model generatif gambar/video). Baca kebijakan *Generative AI*
      Adobe Stock terbaru dan tandai sesuai ketentuannya. Jika ragu, tandai.
- [ ] Kategori: *Graphic Resources* / *Backgrounds* (pilih yang paling sesuai saat upload)

## 8. Keterbatasan teknis

1. **WebGL2 wajib.** three.js r163+ tidak lagi mendukung WebGL1. Perangkat/GPU lama yang tidak
   punya WebGL2 akan mendapat pesan error yang jelas, bukan layar hitam.
2. **Bukan path tracing.** Pantulan berasal dari studio analitik, bukan dari scene. Tidak ada
   pantulan diri antar bagian pita, bayangan, AO, atau refraksi. Efek iridesen adalah
   *aproksimasi* thin film dengan palet terbatas, bukan simulasi spektral.
3. **Tidak ada bloom, depth of field, atau motion blur.** Sengaja dihindari agar tetap ringan di
   Android, deterministik, dan tidak butuh float render target. Gerakan yang lambat membuat
   ketiadaan motion blur nyaris tak terlihat.
4. **Pita bisa menembus dirinya sendiri** saat melipat tajam (tidak ada simulasi tabrakan).
   Pada material cair ini terlihat seperti cairan menyatu, tetapi tetap periksa secara visual.
5. **Determinisme per perangkat.** Frame yang sama selalu identik di GPU/driver yang sama. Antar
   GPU berbeda bisa ada selisih kecil (±1 nilai warna). Render satu sekuens penuh di satu mesin.
6. **Performa Android belum diukur** oleh pembuat. Gunakan angka FPS di panel dan pilih preset.
   Vertex shader cukup berat (3 evaluasi permukaan per vertex, noise 4D).
7. **Ekspor H.264 di Android belum diuji di perangkat nyata.** Alur yang sama sudah lolos uji
   dengan VP9 di Chromium. Dukungan & kualitas encoder bergantung pada ponsel dan versi Chrome.
8. Pada preset `low` (tanpa MSAA, DPR 1) tepi tipis terlihat bergerigi. Itu hanya untuk
   pratinjau; ekspor selalu memakai mode capture.

## 9. Lisensi pihak ketiga

- three.js r185.1 — MIT — `vendor/three/LICENSE`
- mp4-muxer 5.2.2 — MIT — `vendor/mp4-muxer/LICENSE`
- webgl-noise (Ashima Arts / Stefan Gustavson) — MIT — disertakan di `src/shaders/noise.glsl.js`
