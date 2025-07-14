"""
CRUD operations for Invoice model using PyMongo
"""
import logging
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from decimal import Decimal
from bson.objectid import ObjectId
from bson.errors import InvalidId
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
from pymongo import ASCENDING, DESCENDING
import json

from app.models.invoice import Invoice, InvoiceCreate, InvoiceUpdate
from app.database import get_invoices_collection

# Set up logger
logger = logging.getLogger(__name__)


def convert_decimals_to_floats(obj):
    """Convert Decimal objects to floats for MongoDB compatibility"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {key: convert_decimals_to_floats(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals_to_floats(item) for item in obj]
    else:
        return obj


class InvoiceCRUD:
    """CRUD operations for Invoice documents using PyMongo"""

    @staticmethod
    def create_invoice(invoice_data: InvoiceCreate) -> Optional[Invoice]:
        """Create a new invoice"""
        try:
            logger.info(f"Starting invoice creation with data: {invoice_data}")
            collection = get_invoices_collection()
            
            # Convert Pydantic model to dict
            invoice_dict = invoice_data.model_dump()
            logger.debug(f"Invoice dict after model_dump: {invoice_dict}")
            
            # Convert date to datetime for MongoDB storage or set default
            from datetime import datetime, date
            if invoice_dict.get("invoice_date"):
                if isinstance(invoice_dict["invoice_date"], date):
                    invoice_dict["invoice_date"] = datetime.combine(
                        invoice_dict["invoice_date"], 
                        datetime.min.time()
                    )
            else:
                # Set default invoice date to current date if not provided
                invoice_dict["invoice_date"] = datetime.utcnow()
            
            logger.debug(f"Invoice date after processing: {invoice_dict.get('invoice_date')}")
            
            # Convert Decimal objects to float for MongoDB storage
            def convert_decimals(obj):
                if isinstance(obj, dict):
                    return {k: convert_decimals(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_decimals(item) for item in obj]
                elif isinstance(obj, Decimal):
                    return float(obj)
                return obj
            
            invoice_dict = convert_decimals(invoice_dict)
            invoice_dict["created_at"] = datetime.utcnow()
            
            logger.debug(f"Final invoice dict before insertion: {invoice_dict}")
            
            # Insert the document
            result = collection.insert_one(invoice_dict)
            logger.info(f"Document inserted with ID: {result.inserted_id}")
            
            # Retrieve and return the created invoice
            created_invoice = collection.find_one({"_id": result.inserted_id})
            logger.debug(f"Retrieved invoice from DB: {created_invoice}")
            
            if created_invoice:
                invoice_obj = Invoice(**created_invoice)
                logger.info(f"Created Invoice object: {invoice_obj}")
                return invoice_obj
            else:
                logger.warning("No invoice found after insertion")
                return None
            
        except DuplicateKeyError as e:
            logger.error(f"DuplicateKeyError: {e}")
            raise ValueError(f"Invoice number {invoice_data.invoice_number} already exists")
        except Exception as e:
            logger.error(f"Exception in create_invoice: {e}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise Exception(f"Failed to create invoice: {str(e)}")

    @staticmethod
    def get_invoice_by_id(invoice_id: str) -> Optional[Invoice]:
        """Get invoice by ID"""
        try:
            collection = get_invoices_collection()
            object_id = ObjectId(invoice_id)
            invoice_data = collection.find_one({"_id": object_id})
            return Invoice(**invoice_data) if invoice_data else None
        except InvalidId:
            return None
        except Exception:
            return None

    @staticmethod
    def get_invoice_by_number(invoice_number: str) -> Optional[Invoice]:
        """Get invoice by invoice number"""
        try:
            collection = get_invoices_collection()
            invoice_data = collection.find_one({"invoice_number": invoice_number})
            return Invoice(**invoice_data) if invoice_data else None
        except Exception:
            return None

    @staticmethod
    def get_all_invoices(
            page: int = 1,
            per_page: int = 10,
            sort_by: str = "created_at",
            order: Literal["asc", "desc"] = "desc",
            status: str | None = None,
            vendor_name: str | None = None,
            category: str | None = None
    ):
        """Get all invoices with optional filtering"""
        try:
            collection = get_invoices_collection()
            # Build filter query
            filter_query = {}
            if status:
                filter_query["status"] = status
            if vendor_name:
                filter_query["vendor_name"] = {"$regex": vendor_name, "$options": "i"}
            if category:
                filter_query["category"] = category

            total = collection.count_documents(filter_query)
            total_pages = (total + per_page - 1) // per_page
            skip = (page - 1) * per_page
            order_by = ASCENDING if order == "asc" else DESCENDING

            cursor = (
                collection.find(filter_query)
                .sort(sort_by, order_by)
                .skip(skip)
                .limit(per_page)
            )

            invoices = [Invoice(**doc) for doc in cursor]

            return {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
                "data": invoices,
            }
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices: {e!s}")

    @staticmethod
    def get_invoices_by_vendor(vendor_name: str) -> List[Invoice]:
        """Get all invoices from a specific vendor"""
        try:
            collection = get_invoices_collection()
            cursor = collection.find({"vendor_name": vendor_name}).sort("invoice_date", DESCENDING)
            
            invoices = []
            for invoice_data in cursor:
                invoices.append(Invoice(**invoice_data))
                
            return invoices
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices for vendor {vendor_name}: {str(e)}")

    @staticmethod
    def get_invoices_by_tags(tags: List[str]) -> List[Invoice]:
        """Get invoices that have any of the specified tags"""
        try:
            collection = get_invoices_collection()
            cursor = collection.find({"tags": {"$in": tags}}).sort("created_at", DESCENDING)
            
            invoices = []
            for invoice_data in cursor:
                invoices.append(Invoice(**invoice_data))
                
            return invoices
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices by tags: {str(e)}")

    @staticmethod
    def get_invoices_by_date_range(start_date: datetime, end_date: datetime) -> List[Invoice]:
        """Get invoices within a date range"""
        try:
            collection = get_invoices_collection()
            cursor = collection.find({
                "invoice_date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }).sort("invoice_date", DESCENDING)
            
            invoices = []
            for invoice_data in cursor:
                invoices.append(Invoice(**invoice_data))
                
            return invoices
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices by date range: {str(e)}")

    @staticmethod
    def update_invoice(invoice_id: str, update_data: InvoiceUpdate) -> Optional[Invoice]:
        """Update an invoice"""
        try:
            logger.info(f"Starting update for invoice_id: {invoice_id}")
            collection = get_invoices_collection()
            
            logger.debug("Converting ObjectId...")
            object_id = ObjectId(invoice_id)
            logger.debug(f"ObjectId converted successfully: {object_id}")
            
            # Convert update data to dict, excluding None values
            logger.debug("Converting update_data to dict...")
            update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)
            logger.debug(f"Update dict: {update_dict}")
            
            # Convert Decimal objects to floats for MongoDB compatibility
            logger.debug("Converting Decimal objects to floats...")
            update_dict = convert_decimals_to_floats(update_dict)
            logger.debug(f"Update dict after conversion: {update_dict}")
            
            if not update_dict:
                logger.debug("No data to update, returning existing invoice")
                # Nothing to update
                return InvoiceCRUD.get_invoice_by_id(invoice_id)
            
            # Update the document
            logger.debug("Updating document in MongoDB...")
            result = collection.update_one(
                {"_id": object_id},
                {"$set": update_dict}
            )
            logger.info(f"Update result - matched_count: {result.matched_count}, modified_count: {result.modified_count}")
            
            if result.matched_count > 0:
                logger.debug("Document found and updated, fetching updated invoice...")
                return InvoiceCRUD.get_invoice_by_id(invoice_id)
            
            logger.warning(f"No document found with ID: {invoice_id}")
            return None
            
        except InvalidId as e:
            logger.error(f"InvalidId exception: {e}")
            return None
        except Exception as e:
            logger.error(f"Exception in update_invoice: {e}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise Exception(f"Failed to update invoice: {str(e)}")

    @staticmethod
    def update_invoice_status(invoice_id: str, status: str) -> Optional[Invoice]:
        """Update invoice status"""
        try:
            collection = get_invoices_collection()
            object_id = ObjectId(invoice_id)
            
            result = collection.update_one(
                {"_id": object_id},
                {"$set": {"status": status}}
            )
            
            if result.matched_count > 0:
                return InvoiceCRUD.get_invoice_by_id(invoice_id)
            return None
            
        except Exception as e:
            raise Exception(f"Failed to update invoice status: {str(e)}")

    @staticmethod
    def delete_invoice(invoice_id: str) -> bool:
        """Delete an invoice"""
        try:
            collection = get_invoices_collection()
            object_id = ObjectId(invoice_id)
            
            result = collection.delete_one({"_id": object_id})
            return result.deleted_count > 0
            
        except Exception as e:
            raise Exception(f"Failed to delete invoice: {str(e)}")

    @staticmethod
    def count_invoices() -> int:
        """Count total number of invoices"""
        try:
            collection = get_invoices_collection()
            return collection.count_documents({})
        except Exception as e:
            raise Exception(f"Failed to count invoices: {str(e)}")

    @staticmethod
    def get_total_amount_by_vendor(vendor_name: str) -> float:
        """Get total amount for a specific vendor"""
        try:
            collection = get_invoices_collection()
            
            pipeline = [
                {"$match": {"vendor_name": vendor_name}},
                {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
            ]
            
            result = list(collection.aggregate(pipeline))
            return float(result[0]["total"]) if result else 0.0
            
        except Exception as e:
            raise Exception(f"Failed to get total amount for vendor {vendor_name}: {str(e)}")

    @staticmethod
    def get_invoices_summary() -> Dict[str, Any]:
        """Get summary statistics"""
        try:
            collection = get_invoices_collection()
            
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_count": {"$sum": 1},
                        "total_amount": {"$sum": "$total_amount"},
                        "avg_amount": {"$avg": "$total_amount"},
                        "min_amount": {"$min": "$total_amount"},
                        "max_amount": {"$max": "$total_amount"}
                    }
                }
            ]
            
            result = list(collection.aggregate(pipeline))
            if result:
                summary = result[0]
                return {
                    "total_count": summary["total_count"],
                    "total_amount": float(summary["total_amount"]),
                    "avg_amount": float(summary["avg_amount"]),
                    "min_amount": float(summary["min_amount"]),
                    "max_amount": float(summary["max_amount"])
                }
            
            return {
                "total_count": 0,
                "total_amount": 0.0,
                "avg_amount": 0.0,
                "min_amount": 0.0,
                "max_amount": 0.0
            }
            
        except Exception as e:
            raise Exception(f"Failed to get invoices summary: {str(e)}")

    @staticmethod
    def get_invoices_by_status_count() -> Dict[str, int]:
        """Get count of invoices by status"""
        try:
            collection = get_invoices_collection()
            
            pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            result = list(collection.aggregate(pipeline))
            return {item["_id"]: item["count"] for item in result}
            
        except Exception as e:
            raise Exception(f"Failed to get invoices by status count: {str(e)}")

    @staticmethod
    def search_invoices(search_term: str) -> List[Invoice]:
        """Search invoices by various fields"""
        try:
            collection = get_invoices_collection()
            
            search_query = {
                "$or": [
                    {"invoice_number": {"$regex": search_term, "$options": "i"}},
                    {"vendor_name": {"$regex": search_term, "$options": "i"}},
                    {"category": {"$regex": search_term, "$options": "i"}},
                    {"tags": {"$regex": search_term, "$options": "i"}},
                    {"items.description": {"$regex": search_term, "$options": "i"}}
                ]
            }
            
            cursor = collection.find(search_query).sort("created_at", DESCENDING)
            
            invoices = []
            for invoice_data in cursor:
                invoices.append(Invoice(**invoice_data))
                
            return invoices
            
        except Exception as e:
            raise Exception(f"Failed to search invoices: {str(e)}")