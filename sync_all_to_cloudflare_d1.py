import requests
import json
import time

def sync():
    with open('sync_d1_full.sql', 'r', encoding='utf-8') as f:
        text = f.read()

    raw_stmts = [s.strip().rstrip(';') for s in text.split(';') if s.strip() and not s.strip().startswith('--')]
    print(f"Total statements to process: {len(raw_stmts)}")

    converted = []
    for s in raw_stmts:
        if s.upper().startswith('INSERT INTO'):
            s = 'INSERT OR REPLACE INTO' + s[11:]
        converted.append(s)

    batch_size = 20
    url = 'https://almasar.moey-atyani.workers.dev/api/d1-batch-sync'
    total_executed = 0
    all_errors = []

    for i in range(0, len(converted), batch_size):
        batch = converted[i:i+batch_size]
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
                print(f"Batch {i//batch_size + 1} ({len(batch)} statements): success ({total_executed} done so far)")
        except Exception as e:
            print(f"Batch {i//batch_size + 1} exception: {e}")
        time.sleep(0.2)

    print(f"\n==========================================")
    print(f"Cloudflare D1 Full Sync Completed!")
    print(f"Total Successfully Executed: {total_executed}")
    print(f"Total Errors: {len(all_errors)}")
    print(f"==========================================\n")

if __name__ == '__main__':
    sync()
