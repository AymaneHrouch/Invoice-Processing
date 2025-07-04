import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "invoice_processing")

# Global client and database instances
client = None
db = None


def init_database():
    """Initialize database connection"""
    global client, db
    
    try:
        # Create PyMongo client
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test the connection
        client.admin.command('ping')
        
        # Create indexes for the invoices collection
        invoices_collection = db["invoices"]
        
        # Create indexes for better performance (ignore errors if indexes already exist)
        try:
            invoices_collection.create_index("invoice_number", unique=True)
        except Exception:
            pass  # Index might already exist
            
        try:
            invoices_collection.create_index("vendor_name")
            invoices_collection.create_index("invoice_date")
            invoices_collection.create_index("status")
            invoices_collection.create_index("category")
            invoices_collection.create_index("created_at")
            invoices_collection.create_index("tags")
        except Exception:
            pass  # Indexes might already exist
        
        print("Database initialized successfully!")
        return True
        
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        print("Note: Database will be initialized when first accessed")
        return False


def close_database():
    """Close database connection"""
    global client
    if client:
        client.close()
        print("Database connection closed!")


def get_database():
    """Get database instance"""
    global db
    if db is None:
        init_database()
    return db


def get_invoices_collection():
    """Get invoices collection"""
    db = get_database()
    return db["invoices"]
