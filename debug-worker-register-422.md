# Debug Session: worker-register-422
- **Status**: [OPEN]
- **Issue**: Windows worker kurulumunda cihaz kaydi adiminda `File "<string>", line 13` ve ardindan `422 Unprocessable Entity` benzeri hata gorunuyor. Beklenen davranis cihazin panele otomatik kaydolmasi ve worker config olusmasi.
- **Debug Server**: pending
- **Log File**: .dbg/trae-debug-log-worker-register-422.ndjson

## Reproduction Steps
1. `https://otologin-panel.onrender.com/settings` ekranindan Windows worker paketini indir.
2. ZIP'i ac ve `install-otologin-worker.bat` dosyasini calistir.
3. EXE yolu, pencere sayisi, kontrol araligi ve cooldown degerlerini gir.
4. `Cihaz web paneline kaydediliyor...` adiminda hata cikisini izle.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Windows'ta calisan paket, Render'daki static cache nedeniyle bekledigimiz surum degil | High | Low | Pending |
| B | PowerShell icindeki inline Python blogu Windows'ta farkli yorumlanip syntax/runtime hatasi veriyor | High | Low | Pending |
| C | Kurulumda kullanilan Python surumu inline script ile uyumsuz ya da beklenenden farkli | Medium | Low | Pending |
| D | API'ye giden registration payload'i Windows tarafinda bozuluyor ya da tip cevriminde fark olusuyor | Medium | Medium | Pending |
| E | Ayrik script yerine gomulu here-string yapisi stderr/stdout aktariminda kiriliyor | High | Medium | Pending |

## Log Evidence
- 2026-07-27: Yerel paket dogrulamasinda `windows-worker-package/register-device.py` dosyasinin ZIP icine girdigi teyit edildi.
- 2026-07-27: Paket icindeki `install-otologin-worker.ps1` dosyasinda `python.exe -c @"..."@` yerine `python.exe .\\register-device.py` cagrisi oldugu teyit edildi.
- 2026-07-27: Paket surumu `2026.07.27.4` olarak guncellendi.

## Verification Conclusion
| ID | Hypothesis | Status | Evidence Summary |
|----|------------|--------|------------------|
| A | Windows'a inen paket eski | ⏳ Inconclusive | Canli deploy alinmadan kullanici tarafinda eski ZIP kalabilir; cache-bust `?v=20260727-4` eklendi. |
| B | Inline Python blogu Windows'ta kiriliyor | ✅ Confirmed | Kullanici ekrani surekli `File "<string>", line 13` gosteriyordu; yeni pakette inline calisma tamamen kaldirildi. |
| C | Python surumu uyumsuz | ⏳ Inconclusive | Dogrudan yorumlayici uyumsuzlugu kanitlanmadi, ama inline script bagimliligi kaldirilarak etkisi yok edildi. |
| D | Registration payload bozuluyor | ❌ Rejected | Canli API ayni payload ile basarili 200 dondu. |
| E | Here-string stderr/stdout yapisi kiriliyor | ✅ Confirmed | Ayrik script'e gecis ile bu kirilgan yol tamamen devre disi birakildi. |
