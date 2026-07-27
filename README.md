# OtoLogin Control Center

Bu repo, Mac uzerinden yonetilen bir web panel ile birden fazla Windows bilgisayarda
calisan 3. parti EXE uygulamasini izlemek, yeniden baslatmak, relogin yapmak ve 4
pencereyi stabil bicimde konumlandirmak icin hazirlanan MVP iskeletidir.

## Neler var?

- `src/`: React tabanli operator paneli
- `api/`: FastAPI tabanli backend omurgasi
- `worker/`: Windows tarafinda calisacak worker state machine iskeleti
- `shared/`: Panelde kullanilan ortak tip tanimlari
- `.trae/documents/`: PRD ve teknik mimari belgeleri

## Veritabani

Backend tarafinda gercek bir veritabani katmani vardir. Varsayilan olarak SQLite kullanir,
ama `DATABASE_URL` verilirse otomatik olarak Postgres baglantisina gecer.

- veritabani dosyasi: `data/otologin.sqlite3`
- Postgres env: `DATABASE_URL=postgresql://...`
- tutulan veriler:
  - panel kullanicilari
  - oturum kayitlari
  - cihazlar
  - cihaz konfigrasyonlari
  - window profilleri
  - worker event loglari
  - komut kuyrugu

Local SQLite kullanirken farkli bir klasore yazdirmak icin `OTOLOGIN_DATA_DIR`
ortam degiskenini verebilirsin.

```bash
OTOLOGIN_DATA_DIR=/absolute/path/to/data .//.venv/bin/uvicorn api.main:app --reload --port 8000
```

Render ucretsiz web servislerinde yerel dosya sistemi kalici degildir. Bu nedenle
ucretsiz deploy ortaminda SQLite verisi yeniden deploy veya servis uykuya girince silinebilir.
Kalici uretim kullanimi icin `Render API + Supabase Postgres` yapisi onerilir.

### SQLite verisini Supabase'e tasima

Once API servisinde `DATABASE_URL` olarak Supabase Postgres baglantini ayarla. Sonra local
makinede asagidaki komutla mevcut SQLite verisini tasiyabilirsin:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:supabase
```

Farkli bir SQLite dosyasi kullanacaksan:

```bash
DATABASE_URL="postgresql://..." python3 scripts/migrate_sqlite_to_postgres.py --sqlite-path /absolute/path/to/otologin.sqlite3
```

Hedef Postgres verisini temizleyip sifirdan yazmak istersen:

```bash
DATABASE_URL="postgresql://..." python3 scripts/migrate_sqlite_to_postgres.py --truncate
```

## Frontend calistirma

```bash
npm install
npm run dev
```

## API calistirma

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements-api.txt
./.venv/bin/uvicorn api.main:app --reload --port 8000
```

## Worker calistirma

Windows makinede:

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements-worker.txt
.venv\Scripts\python worker\runner.py
```

## Windows indirme paketi

Web panelden indirilecek Windows kurulum paketini uretmek icin:

```bash
./scripts/build_worker_package.sh
```

Bu komut su dosyalari hazirlar:

- `public/downloads/otologin-windows-worker.zip`
- `public/downloads/install-otologin-worker.bat`
- `public/downloads/install-otologin-worker.ps1`
- `public/downloads/worker-config.template.json`

Windows tarafinda hedef akis:

1. Panelden `otologin-windows-worker.zip` dosyasini indir.
2. ZIP'i cikar.
3. `install-otologin-worker.bat` dosyasini calistir.
4. Kurulum paketi API adresini otomatik kullanir; sadece bu bilgisayardaki EXE yolunu gir.
5. Script cihaz adini ve Windows surumunu otomatik okuyup web API'ye gonderir.
6. API kaydi tamamlaninca `worker-config.json` otomatik yazilir ve worker baslatilir.

Kurulum scripti su isleri otomatik yapar:

- Python yoksa `winget` ile Python 3.11 kurmaya calisir
- `pip`, `setuptools`, `wheel` gunceller
- `requirements-worker.txt` icindeki eksik Python paketlerini kurar
- makineye ait kalici `machine_key` uretir ve tekrar kurulumlarda ayni cihaz kaydini gunceller
- `worker-config.json` dosyasini web API'den gelen verilerle olusturur
- Windows acilisinda otomatik baslamasi icin Startup kisayolu ekler
- kurulumu bitirince worker'i otomatik baslatir

## Canli yayin

Bu proje icin en pratik ucretsiz secenek:

- `Render`: ayni Git reposundan hem frontend hem FastAPI backend deploy etmek icin en rahat yol
- `Vercel`: sadece frontend'i ayri deploy etmek istersen hizli alternatif

Hazir deploy dosyalari:

- `render.yaml`: Render uzerinde `otologin-panel` ve `otologin-api` servislerini olusturur
- `vercel.json`: Vite frontend'i Vercel'e deploy etmek icin hazir
- `.env.example`: ortam degiskeni sablonu

### Render ile yayin adimlari

1. Bu projeyi GitHub'a yukle.
2. Render'da `New +` -> `Blueprint` sec.
3. GitHub reposunu bagla.
4. Render `render.yaml` dosyasini okuyup frontend ve backend servislerini olustursun.
5. Frontend URL'si olusunca backend servisindeki `ALLOWED_ORIGINS` degerini o domaine gore guncelle.
6. Supabase kullaniyorsan API servisinde `DATABASE_URL` ortam degiskenine Postgres baglanti metnini ekle.
7. Ilk geciste gerekiyorsa local SQLite verisini `npm run db:migrate:supabase` ile Supabase'e tasi.

### Vercel ile sadece panel yayinlamak

1. Bu projeyi GitHub'a yukle.
2. Vercel'de `Add New Project` ile repoyu bagla.
3. Framework olarak Vite otomatik algilanir.
4. Gerekirse `VITE_API_BASE_URL` ortam degiskenini ekle.

## Testler

```bash
npm run check
npm run test
./.venv/bin/pytest api/tests worker/tests
```

## Sonraki adimlar

1. Supabase migration ve ilk veri tasima scriptini ekle.
2. Worker tarafinda gercek Windows EXE ile hotkey ve helper otomasyonunu sahada dogrula.
3. Credential Manager ile sifreleri cihaz bazli sakla.
4. Panel girisine 2FA ekle.
