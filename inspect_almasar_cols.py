import psycopg2

conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
cur = conn.cursor()
for table in ['inventory_items', 'technician_tasks', 'production_orders', 'purchase_orders', 'purchase_order_lines', 'crm_leads']:
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")
    print(table, [r[0] for r in cur.fetchall()])
