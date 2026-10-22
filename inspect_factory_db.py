import psycopg2

try:
    conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/factory_db")
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
    for r in cur.fetchall():
        t = r[0]
        cur.execute(f'SELECT count(*) FROM "{t}"')
        c = cur.fetchone()[0]
        if c > 0:
            print(f"{t}: {c}")
except Exception as e:
    print("Error:", e)
