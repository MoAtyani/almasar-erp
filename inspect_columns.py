import psycopg2

conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/factory_db")
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='product_template'")
print("product_template:", [r[0] for r in cur.fetchall()])
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='project_task'")
print("project_task:", [r[0] for r in cur.fetchall()])
