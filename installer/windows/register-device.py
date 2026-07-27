import json
import os
import sys

import httpx


def main() -> int:
    url = os.environ.get("OTOLOGIN_REGISTRATION_API", "").strip()
    raw_payload = os.environ.get("OTOLOGIN_REGISTRATION_BODY", "")

    if not url:
        sys.stderr.write("Baglanti hatasi: OTOLOGIN_REGISTRATION_API bos.\n")
        return 1

    try:
        payload = json.loads(raw_payload)
    except Exception as exc:
        sys.stderr.write("Payload parse hatasi: %s\n" % exc)
        return 1

    try:
        response = httpx.post(url, json=payload, timeout=60.0)
    except Exception as exc:
        sys.stderr.write("Baglanti hatasi: %s\n" % exc)
        return 1

    if response.is_error:
        sys.stderr.write("HTTP %s: %s\n" % (response.status_code, response.text))
        return 1

    sys.stdout.write(response.text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
