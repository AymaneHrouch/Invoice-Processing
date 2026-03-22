import logging
import os
import sys

from dotenv import load_dotenv
from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

logger = logging.getLogger(__name__)

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "invoice_processing")

client = None
db = None


def init_database():
    """Initialize database connection"""
    global client, db

    try:
        import certifi
        client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
        db = client[DB_NAME]

        client.admin.command("ping")
        logger.info("Connected to MongoDB (%s)", DB_NAME)

        invoices_collection = db["invoices"]

        # Compound unique index: invoice_number is unique per company, not globally.
        # Drop the legacy global unique index on invoice_number if it exists.
        try:
            invoices_collection.drop_index("invoice_number_1")
        except Exception:
            pass
        try:
            invoices_collection.create_index(
                [("invoice_number", 1), ("company_id", 1)], unique=True
            )
        except Exception:
            pass

        try:
            invoices_collection.create_index("vendor_name")
            invoices_collection.create_index("invoice_date")
            invoices_collection.create_index("status")
            invoices_collection.create_index("category")
            invoices_collection.create_index("created_at")
        except Exception:
            pass

        logger.info("Database initialized successfully.")
        return True

    except Exception as e:
        logger.exception("Failed to initialize database: %s", e)
        return False


def close_database():
    """Close database connection"""
    global client
    if client:
        client.close()
        logger.info("Database connection closed.")


def get_database():
    """Get database instance"""
    global db
    if db is None:
        init_database()
    return db


def get_invoices_collection():
    """Get invoices collection"""
    try:
        db = get_database()
        return db["invoices"]
    except Exception as e:
        logger.exception("Error getting invoices collection: %s", e)
        raise


def get_cache_collection():
    """Get extraction cache collection (file_hash -> result)"""
    return get_database()["cache"]


def get_company_collection():
    """Get company_profile collection (single document)"""
    return get_database()["company_profile"]


def get_contacts_collection():
    """Get contacts collection (clients + suppliers)"""
    return get_database()["contacts"]


def get_firm_collection():
    """Get firms collection (one doc per accounting firm/tenant)"""
    return get_database()["firms"]
