import sqlite3
conn = sqlite3.connect("C:/CarePulse/backend/personnelai.db")
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("TABLES:", tables)
for t in ["deployment_records", "leave_records", "duty_records"]:
    if t in tables:
        c.execute(f"SELECT count(*) FROM [{t}]")
        print(f"  {t}: {c.fetchone()[0]} rows")
    else:
        print(f"  {t}: MISSING")
conn.close()
