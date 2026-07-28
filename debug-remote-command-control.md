# Debug Session: remote-command-control
- **Status**: [OPEN]
- **Issue**: Panelden uzaktaki Windows cihaza komut gonderiliyor gibi gorunuyor ancak cihaz tarafinda hicbir aksiyon calismiyor.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-remote-command-control.ndjson

## Reproduction Steps
1. Dashboard uzerinde kayitli bir Windows cihaz kartini ac.
2. `Relogin`, `Yeniden baslat` veya `Pencere hizala` butonlarindan birine tikla.
3. Komutun cihaz tarafinda herhangi bir aksiyon uretip uretmedigini gozlemle.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Worker komutlari hic cekemiyor, kuyrukta kalan komutlar cihaz tarafina ulasmiyor. | High | Low | Pending |
| B | Internet durumu yanlis negatif; worker aslinda erisilebilir ama kontrol mekanizmasi false donuyor. | High | Low | Pending |
| C | Worker komutu cekiyor ama execute adiminda exception verip sessizce dusuyor. | Medium | Medium | Pending |
| D | Token / auth uyumsuzlugu yuzunden worker config veya command endpoint'leri 401 donuyor. | Medium | Low | Pending |
| E | Dashboard cihazi yonetilebilir gibi gosteriyor ama worker stale heartbeat ile gorunuyor. | Medium | Low | Pending |

## Log Evidence
- L1: Panel komutu basariyla kuyruga yaziliyor (`command_id=ec20151f-ceba-43d1-9797-218f9e3f5dbb`).
- L2: `worker_token` olmayan worker komut cekme isteginde `401 Unauthorized` aliyor.
- L4: Gecerli `worker_token` ile ayni cihaz komutu normal sekilde cekebiliyor (`status_code=200`).

## Verification Conclusion
Komut zinciri panel tarafinda kirik degil; kirilma worker tarafinin token bootstrap edememesinde. Bu da ozellikle guvenlik guncellemesinden once kurulmus worker'larda "butona basiyorum ama hicbir sey olmuyor" semptomunu uretiyor.

### Pre-fix vs Post-fix
- **Pre-fix**: `worker_token` olmayan worker komut cekmeye calistiginda `401` aliyordu.
- **Post-fix**: Ayni worker `machine_key` ile config'i cekip `worker_token` alabiliyor; hemen ardindan komut kuyrugunu `200` ile okuyabiliyor.
