import psycopg2

conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
cur = conn.cursor()
for table in ['technician_tasks', 'production_orders', 'purchase_orders', 'crm_leads']:
    cur.execute(f"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = '{table}'::regclass")
    print(f"--- {table} ---")
    for r in cur.fetchall():
        print(r[0], r[1])
