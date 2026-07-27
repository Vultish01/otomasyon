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
4. `worker-config.json` icine API adresini, cihaz kimligini ve EXE yolunu yaz.
5. `start-otologin-worker.bat` ile worker'i baslat.

Kurulum scripti su isleri otomatik yapar:

- Python yoksa `winget` ile Python 3.11 kurmaya calisir
- `pip`, `setuptools`, `wheel` gunceller
- `requirements-worker.txt` icindeki eksik Python paketlerini kurar
- `worker-config.json` dosyasini olusturur
- Windows acilisinda otomatik baslamasi icin Startup kisayolu ekler

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

1. Frontend store yerine gercek API entegrasyonunu bagla.
2. Worker tarafina pywinauto + Win32 pencere yonetimini ekle.
3. Credential Manager ile sifreleri cihaz bazli sakla.
4. Panel girisine gercek kimlik dogrulama ve 2FA ekle.
```
