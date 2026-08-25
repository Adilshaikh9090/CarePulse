import urllib.request
import json
import traceback

base = "http://127.0.0.1:8000"

# login
data = json.dumps({"login_id": "WELFARE-01", "password": "demo1234"}).encode()
req = urllib.request.Request(f"{base}/auth/login", data=data, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read())["access_token"]

# try analytics
try:
    req2 = urllib.request.Request(f"{base}/analytics/summary", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req2) as resp2:
        print("status:", resp2.status)
        print(resp2.read().decode()[:500])
except urllib.error.HTTPError as e:
    print("HTTP", e.code)
    print(e.read().decode()[:1000])
except Exception:
    traceback.print_exc()
