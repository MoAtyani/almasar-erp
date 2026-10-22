import psycopg2
import json

def export_d1():
    conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
    cur = conn.cursor()

    lines = []
    lines.append("-- Synchronized Business Data from Localhost to Cloudflare D1")
    lines.append("PRAGMA foreign_keys = OFF;")

    tables = [
        'profiles',
        'panel_projects',
        'inventory_items',
        'technician_tasks',
        'production_orders',
        'purchase_orders',
        'purchase_order_lines',
        'crm_leads',
        'employees'
    ]

    for table in tables:
        lines.append(f"\n-- {table}")
        lines.append(f"DELETE FROM {table};")

        # get columns
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table}'")
        cols_info = cur.fetchall()
        cols = [c[0] for c in cols_info]

        col_str = ", ".join(cols)
        cur.execute(f"SELECT {col_str} FROM {table}")
        rows = cur.fetchall()

        for r in rows:
            val_strs = []
            for v in r:
                if v is None:
                    val_strs.append("NULL")
                elif isinstance(v, (int, float)):
                    val_strs.append(str(v))
                elif isinstance(v, bool):
                    val_strs.append("1" if v else "0")
                else:
                    # string / date / json
                    cleaned = str(v).replace("'", "''")
                    val_strs.append(f"'{cleaned}'")
            lines.append(f"INSERT INTO {table} ({col_str}) VALUES ({', '.join(val_strs)});")

    lines.append("\nPRAGMA foreign_keys = ON;")
    
    with open("sync_d1_full.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Generated sync_d1_full.sql with {len(lines)} lines")

if __name__ == "__main__":
    export_d1()
