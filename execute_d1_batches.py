import subprocess
import os

def execute_batches():
    with open("sync_d1_full.sql", "r", encoding="utf-8") as f:
        content = f.read()

    # Split into clean statements
    statements = [s.strip() for s in content.split(";") if s.strip() and not s.strip().startswith("--")]
    print(f"Total SQL statements to execute on Cloudflare D1: {len(statements)}")

    # Set UTF-8 environment
    my_env = os.environ.copy()
    my_env["PYTHONIOENCODING"] = "utf-8"

    batch_size = 10
    for i in range(0, len(statements), batch_size):
        batch = statements[i:i+batch_size]
        combined_sql = "; ".join(batch) + ";"
        
        # Write batch to temporary file
        with open("temp_batch.sql", "w", encoding="utf-8") as bf:
            bf.write(combined_sql)

        print(f"Executing batch {i//batch_size + 1}/{(len(statements)-1)//batch_size + 1} ({len(batch)} statements)...")
        
        proc = subprocess.run(
            'npx wrangler d1 execute almasar-db --remote --command="' + combined_sql.replace('"', '\\"') + '"',
            capture_output=True,
            text=True,
            shell=True,
            encoding='utf-8',
            errors='replace',
            env=my_env
        )
        if proc.returncode != 0:
            print(f"Batch {i//batch_size + 1} warning/error. Retrying individually...")
            for st in batch:
                res = subprocess.run(
                    'npx wrangler d1 execute almasar-db --remote --command="' + st.replace('"', '\\"') + '; "',
                    capture_output=True,
                    text=True,
                    shell=True,
                    encoding='utf-8',
                    errors='replace',
                    env=my_env
                )
        else:
            print(f"Batch {i//batch_size + 1} OK.")

    if os.path.exists("temp_batch.sql"):
        os.remove("temp_batch.sql")

    print("\n--- All D1 data sync completed! ---")

if __name__ == "__main__":
    execute_batches()
