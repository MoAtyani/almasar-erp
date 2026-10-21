import psycopg2
import sys

def main():
    print("Connecting to PostgreSQL almasar_erp_db...")
    try:
        conn = psycopg2.connect(dbname='almasar_erp_db', user='openpg', password='openpgpwd', host='localhost', port=5432)
        cur = conn.cursor()
        
        with open(r'd:\almasar-erp\supabase\complete_schema.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
            
        cur.execute(sql)
        conn.commit()
        print("complete_schema.sql executed successfully.")
        
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' 
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cur.fetchall()]
        print(f"Total tables created ({len(tables)}):")
        for t in tables:
            print(f"  ✓ {t}")
            
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error during schema initialization: {e}")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
