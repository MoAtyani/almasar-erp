import psycopg2
import json

conn = psycopg2.connect('postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db')
cur = conn.cursor()

# Get all tables in public schema
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
""")
tables = [r[0] for r in cur.fetchall()]

ddl_statements = [
    "PRAGMA foreign_keys = OFF;"
]

# Drop all tables first
for t in reversed(tables):
    ddl_statements.append(f"DROP TABLE IF EXISTS {t};")

type_map = {
    'uuid': 'TEXT',
    'text': 'TEXT',
    'character varying': 'TEXT',
    'timestamp with time zone': 'TEXT',
    'timestamp without time zone': 'TEXT',
    'date': 'TEXT',
    'numeric': 'REAL',
    'integer': 'INTEGER',
    'boolean': 'INTEGER',
    'jsonb': 'TEXT',
    'ARRAY': 'TEXT'
}

for t in tables:
    cur.execute(f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = '{t}'
        ORDER BY ordinal_position;
    """)
    cols = cur.fetchall()
    col_defs = []
    for col_name, dt, nullable in cols:
        sqlite_type = type_map.get(dt, 'TEXT')
        pk = " PRIMARY KEY" if col_name == 'id' else ""
        col_defs.append(f"  {col_name} {sqlite_type}{pk}")
    
    table_sql = f"CREATE TABLE {t} (\n" + ",\n".join(col_defs) + "\n);"
    ddl_statements.append(table_sql)

with open("d:/almasar-erp/cloudflare_d1_schema.sql", "w", encoding="utf-8") as f:
    f.write("\n\n".join(ddl_statements))

print(f"Generated cloudflare_d1_schema.sql for {len(tables)} tables")

# Now export rows
insert_statements = [
    "PRAGMA foreign_keys = OFF;"
]
for t in tables:
    cur.execute(f"SELECT * FROM {t}")
    rows = cur.fetchall()
    if not rows:
        continue
    colnames = [desc[0] for desc in cur.description]
    for row in rows:
        vals = []
        for v in row:
            if v is None:
                vals.append("NULL")
            elif isinstance(v, (int, float)):
                vals.append(str(v))
            elif isinstance(v, bool):
                vals.append("1" if v else "0")
            elif isinstance(v, (dict, list)):
                s = json.dumps(v).replace("'", "''")
                vals.append(f"'{s}'")
            else:
                s = str(v).replace("'", "''")
                vals.append(f"'{s}'")
        col_str = ", ".join(colnames)
        val_str = ", ".join(vals)
        insert_statements.append(f"INSERT INTO {t} ({col_str}) VALUES ({val_str});")

with open("d:/almasar-erp/cloudflare_d1_seed.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(insert_statements))

print(f"Generated cloudflare_d1_seed.sql with {len(insert_statements)} statements")

cur.close()
conn.close()
