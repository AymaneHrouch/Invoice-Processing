import os
import sys

# Add backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_invoices_collection

# Default exchange rates as defined in dashboard.py
EXCHANGE_RATES = {
    "USD": 9.06,
    "EUR": 10.4876,
    "MAD": 1.0
}

def migrate_invoices():
    print("Starting exchange rate migration...")
    collection = get_invoices_collection()
    
    # Find invoices that don't have an exchange_rate set
    invoices = collection.find({"exchange_rate": {"$exists": False}})
    
    count = 0
    updated_count = 0
    
    for invoice in invoices:
        count += 1
        currency = invoice.get("currency", "MAD")
        
        # Determine the exchange rate to use
        # If it's a known currency, use the static rate. Otherwise default to 1.0
        rate = EXCHANGE_RATES.get(currency, 1.0)
        
        result = collection.update_one(
            {"_id": invoice["_id"]},
            {"$set": {"exchange_rate": rate}}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            
    print(f"Migration complete.")
    print(f"Total invoices processed: {count}")
    print(f"Total invoices updated: {updated_count}")

if __name__ == "__main__":
    migrate_invoices()
