import zipfile, os

dist = "C:/CarePulse/frontend/dist"
out = "C:/Users/fouzi/AppData/Local/Temp/deploy_unix.zip"

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, dist).replace("\\", "/")
            zf.write(full, arcname)
            print(f"  {arcname}")

print(f"\nZip created: {out}")
