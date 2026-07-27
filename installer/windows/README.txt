OtoLogin Windows Worker Kurulumu

1. Bu klasoru zip icinden cikarin.
2. install-otologin-worker.bat dosyasina cift tiklayin.
3. Kurulum sirasi geldiginde API adresini ve bu bilgisayardaki EXE yolunu girin.
4. Script cihazi panele otomatik kaydeder, worker-config.json dosyasini doldurur ve worker'i baslatir.
5. Sonraki ayarlari panelden degistirebilirsiniz.

Notlar:
- Python yoksa kurulum scripti winget ile Python 3.11 kurmayi dener.
- worker-config.json kurulum sonunda otomatik uretilir.
- Ayni bilgisayara tekrar kurulum yapildiginda machine_key ile mevcut cihaz kaydi guncellenir.
- Gercek Windows otomasyonu sonraki adimda pywinauto ve Win32 entegrasyonu ile tamamlanacaktir.
