import psycopg2
import requests
import json
import time

def sync_complete_data():
    conn = psycopg2.connect('postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db')
    cur = conn.cursor()

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
    tables = [t[0] for t in cur.fetchall()]

    all_stmts = []

    # Ensure panel_catalogue, audit_logs, system_notifications, production_order_history exist in D1
    schema_stmts = [
        """CREATE TABLE IF NOT EXISTS panel_catalogue (
            id TEXT PRIMARY KEY,
            model_code TEXT,
            model_name TEXT,
            rated_current_a REAL,
            rated_voltage_v REAL,
            standard_busbar_size TEXT,
            base_price REAL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT,
            entity_type TEXT,
            entity_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS system_notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            message TEXT,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS production_order_history (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            previous_stage TEXT,
            new_stage TEXT,
            changed_by TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )"""
    ]
    all_stmts.extend(schema_stmts)

    for tbl in tables:
        cur.execute(f'SELECT count(*) FROM "{tbl}"')
        count = cur.fetchone()[0]
        if count == 0:
            continue

        print(f"Exporting {tbl}: {count} rows...")
        cur.execute(f'SELECT * FROM "{tbl}"')
        col_names = [desc[0] for desc in cur.description]
        rows = cur.fetchall()

        for r in rows:
            formatted_vals = []
            for v in r:
                if v is None:
                    formatted_vals.append("NULL")
                elif isinstance(v, (int, float)):
                    formatted_vals.append(str(v))
                elif isinstance(v, bool):
                    formatted_vals.append("1" if v else "0")
                elif isinstance(v, (dict, list)):
                    s = json.dumps(v).replace("'", "''")
                    formatted_vals.append(f"'{s}'")
                else:
                    s = str(v).replace("'", "''")
                    formatted_vals.append(f"'{s}'")
            
            cols_str = ", ".join([f'"{c}"' for c in col_names])
            vals_str = ", ".join(formatted_vals)
            stmt = f'INSERT OR REPLACE INTO "{tbl}" ({cols_str}) VALUES ({vals_str})'
            all_stmts.append(stmt)

    print(f"\nTotal SQL statements generated: {len(all_stmts)}")

    url = 'https://almasar.moey-atyani.workers.dev/api/d1-batch-sync'
    batch_size = 20
    total_executed = 0
    all_errors = []

    for i in range(0, len(all_stmts), batch_size):
        batch = all_stmts[i:i+batch_size]
        try:
            headers = {'Content-Type': 'application/json; charset=utf-8'}
            body_bytes = json.dumps({'statements': batch}, ensure_ascii=False).encode('utf-8')
            res = requests.post(url, data=body_bytes, headers=headers, timeout=60)
            data = res.json()
            executed = data.get('count', 0)
            errors = data.get('errors', [])
            total_executed += executed
            if errors:
                all_errors.extend(errors)
                print(f"Batch {i//batch_size + 1} had errors: {errors}")
            else:
                print(f"Batch {i//batch_size + 1} ({len(batch)} statements): success ({total_executed}/{len(all_stmts)} done)")
        except Exception as e:
            print(f"Batch {i//batch_size + 1} exception: {e}")
        time.sleep(0.15)

    print(f"\n==========================================")
    print(f"Cloudflare D1 Complete Data Sync Finished!")
    print(f"Total Statements Executed: {total_executed}")
    print(f"Total Errors: {len(all_errors)}")
    print(f"==========================================\n")

if __name__ == '__main__':
    sync_complete_data()
