OtoLogin Windows Worker Kurulumu

1. Bu klasoru zip icinden cikarin.
2. install-otologin-worker.bat dosyasina cift tiklayin.
3. Kurulum bitince worker-config.json dosyasini acin.
4. api_base_url, device_id ve exe_path alanlarini doldurun.
5. start-otologin-worker.bat dosyasi ile worker'i baslatin.

Notlar:
- Python yoksa kurulum scripti winget ile Python 3.11 kurmayi dener.
- worker-config.json cihaz bazli ayarlar icindir.
- Gercek Windows otomasyonu sonraki adimda pywinauto ve Win32 entegrasyonu ile tamamlanacaktir.
