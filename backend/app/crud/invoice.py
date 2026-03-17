"""
CRUD operations for Invoice model using PyMongo
"""
from datetime import date, datetime
from decimal import Decimal
import logging
from typing import Any, Literal

from bson.errors import InvalidId
from bson.objectid import ObjectId
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError

from app.database import get_invoices_collection
from app.models.invoice import Invoice, InvoiceCreate, InvoiceUpdate

logger = logging.getLogger(__name__)


def convert_decimals_to_floats(obj):
    """Convert Decimal objects to floats for MongoDB compatibility"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {key: convert_decimals_to_floats(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [convert_decimals_to_floats(item) for item in obj]
    return obj


class InvoiceCRUD:
    """CRUD operations for Invoice documents using PyMongo"""

    @staticmethod
    def create_invoice(invoice_data: InvoiceCreate) -> Invoice | None:
        """Create a new invoice"""
        try:
            collection = get_invoices_collection()

            invoice_dict = invoice_data.model_dump(exclude_unset=True, exclude_none=True)

            invoice_dict.setdefault("is_exported", False)
            invoice_dict.setdefault("is_paid", False)
            invoice_dict.setdefault("is_archived", False)
            invoice_dict.setdefault("direction", "incoming")
            # Backward compat: populate vendor_ice from ice if missing
            if not invoice_dict.get("vendor_ice") and invoice_dict.get("ice"):
                invoice_dict["vendor_ice"] = invoice_dict["ice"]

            if invoice_dict.get("invoice_date"):
                if isinstance(invoice_dict["invoice_date"], date):
                    invoice_dict["invoice_date"] = datetime.combine(
                        invoice_dict["invoice_date"],
                        datetime.min.time()
                    )
            else:
                invoice_dict["invoice_date"] = datetime.utcnow()

            def convert_decimals(obj):
                if isinstance(obj, dict):
                    return {k: convert_decimals(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [convert_decimals(item) for item in obj]
                if isinstance(obj, Decimal):
                    return float(obj)
                return obj

            invoice_dict = convert_decimals(invoice_dict)
            invoice_dict["created_at"] = datetime.utcnow()

            result = collection.insert_one(invoice_dict)
            logger.info("Invoice inserted with ID: %s", result.inserted_id)

            created_invoice = collection.find_one({"_id": result.inserted_id})

            if created_invoice:
                return Invoice(**created_invoice)
            logger.warning("No invoice found after insertion")
            return None

        except DuplicateKeyError:
            raise ValueError(f"Invoice number {invoice_data.invoice_number} already exists")
        except Exception as e:
            logger.exception("Failed to create invoice: %s", e)
            raise Exception(f"Failed to create invoice: {e!s}")

    @staticmethod
    def get_invoice_by_id(invoice_id: str) -> Invoice | None:
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
    def get_invoice_by_number(invoice_number: str) -> Invoice | None:
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
            category: str | None = None,
            is_exported: bool | None = None,
            is_paid: bool | None = None,
            include_archived: bool = False,
            direction: str | None = None,
            start_date: datetime | None = None,
            end_date: datetime | None = None,
            overdue: bool | None = None,
    ):
        """Get all invoices with optional filtering. Excludes archived by default."""
        try:
            collection = get_invoices_collection()
            # Build filter query
            filter_query: dict = {}
            if not include_archived:
                filter_query["is_archived"] = {"$ne": True}
            if status:
                filter_query["status"] = status
            if vendor_name:
                filter_query["vendor_name"] = {"$regex": vendor_name, "$options": "i"}
            if category:
                filter_query["category"] = category
            if is_exported is not None:
                filter_query["is_exported"] = is_exported
            if is_paid is not None:
                filter_query["is_paid"] = is_paid
            if direction is not None:
                filter_query["direction"] = direction
            if start_date or end_date:
                date_filter: dict = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                filter_query["invoice_date"] = date_filter
            if overdue:
                today = datetime.utcnow()
                filter_query["invoice_due_date"] = {"$lt": today}
                filter_query["is_paid"] = {"$ne": True}

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
    def get_invoices_for_export(
            status: str | None = None,
            vendor_name: str | None = None,
            category: str | None = None,
            is_exported: bool | None = None,
            include_archived: bool = False,
            direction: str | None = None,
            sort_by: str = "created_at",
            order: Literal["asc", "desc"] = "desc",
    ) -> list[Invoice]:
        """Get all invoices matching filters for export (no pagination)."""
        try:
            collection = get_invoices_collection()
            filter_query = {}
            if not include_archived:
                filter_query["is_archived"] = {"$ne": True}
            if status:
                filter_query["status"] = status
            if vendor_name:
                filter_query["vendor_name"] = {"$regex": vendor_name, "$options": "i"}
            if category:
                filter_query["category"] = category
            if is_exported is not None:
                filter_query["is_exported"] = is_exported
            if direction:
                filter_query["direction"] = direction

            order_by = ASCENDING if order == "asc" else DESCENDING
            cursor = collection.find(filter_query).sort(sort_by, order_by)
            return [Invoice(**doc) for doc in cursor]
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices for export: {e!s}")

    @staticmethod
    def bulk_mark_exported(invoice_ids: list[str]) -> int:
        """Mark multiple invoices as exported. Returns count of updated documents."""
        if not invoice_ids:
            return 0
        try:
            collection = get_invoices_collection()
            object_ids = [ObjectId(oid) for oid in invoice_ids if ObjectId.is_valid(oid)]
            if not object_ids:
                return 0
            result = collection.update_many(
                {"_id": {"$in": object_ids}},
                {"$set": {"is_exported": True, "exported_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
            )
            return result.modified_count
        except Exception as e:
            logger.exception("Bulk mark exported failed: %s", e)
            raise

    @staticmethod
    def get_invoices_by_vendor(vendor_name: str) -> list[Invoice]:
        """Get all invoices from a specific vendor"""
        try:
            collection = get_invoices_collection()
            cursor = collection.find({"vendor_name": vendor_name}).sort("invoice_date", DESCENDING)

            invoices = []
            for invoice_data in cursor:
                invoices.append(Invoice(**invoice_data))

            return invoices
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices for vendor {vendor_name}: {e!s}")

    @staticmethod
    def get_invoices_by_tags(tags: list[str]) -> list[Invoice]:
        """Get invoices that have any of the specified tags"""
        try:
            collection = get_invoices_collection()
            cursor = collection.find({"tags": {"$in": tags}}).sort("created_at", DESCENDING)

            invoices = []
            for invoice_data in cursor:
                invoices.append(Invoice(**invoice_data))

            return invoices
        except Exception as e:
            raise Exception(f"Failed to retrieve invoices by tags: {e!s}")

    @staticmethod
    def get_invoices_by_date_range(start_date: datetime, end_date: datetime) -> list[Invoice]:
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
            raise Exception(f"Failed to retrieve invoices by date range: {e!s}")

    @staticmethod
    def update_invoice(invoice_id: str, update_data: InvoiceUpdate) -> Invoice | None:
        """Update an invoice"""
        try:
            collection = get_invoices_collection()
            object_id = ObjectId(invoice_id)

            update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)
            update_dict["updated_at"] = datetime.utcnow()
            update_dict = convert_decimals_to_floats(update_dict)

            if not update_dict:
                return InvoiceCRUD.get_invoice_by_id(invoice_id)

            result = collection.update_one(
                {"_id": object_id},
                {"$set": update_dict}
            )
            logger.info("Update invoice %s — matched: %d, modified: %d",
                        invoice_id, result.matched_count, result.modified_count)

            if result.matched_count > 0:
                return InvoiceCRUD.get_invoice_by_id(invoice_id)

            return None

        except InvalidId as e:
            logger.warning("Invalid ObjectId: %s", e)
            return None
        except Exception as e:
            logger.exception("Failed to update invoice %s: %s", invoice_id, e)
            raise Exception(f"Failed to update invoice: {e!s}")

    @staticmethod
    def batch_update_invoices(
        invoice_ids: list[str],
        is_paid: bool | None = None,
        direction: str | None = None,
        status: str | None = None,
        is_archived: bool | None = None,
        is_exported: bool | None = None,
    ) -> int:
        """Update multiple invoices with the same field values. Returns count of updated documents."""
        if not invoice_ids:
            return 0
        set_op = {"updated_at": datetime.utcnow()}
        unset_op = {}
        if is_paid is not None:
            set_op["is_paid"] = is_paid
            if is_paid:
                set_op["paid_at"] = datetime.utcnow()
            else:
                unset_op["paid_at"] = ""
        if direction is not None:
            set_op["direction"] = direction
        if status is not None:
            set_op["status"] = status
        if is_archived is not None:
            set_op["is_archived"] = is_archived
        if is_exported is not None:
            set_op["is_exported"] = is_exported
            if not is_exported:
                unset_op["exported_at"] = ""
        if is_paid is None and direction is None and status is None and is_archived is None and is_exported is None:
            return 0
        try:
            collection = get_invoices_collection()
            object_ids = [ObjectId(oid) for oid in invoice_ids if ObjectId.is_valid(oid)]
            if not object_ids:
                return 0
            update = {"$set": set_op}
            if unset_op:
                update["$unset"] = unset_op
            result = collection.update_many(
                {"_id": {"$in": object_ids}},
                update,
            )
            return result.modified_count
        except Exception as e:
            logger.exception("Batch update failed: %s", e)
            raise

    @staticmethod
    def update_invoice_status(invoice_id: str, status: str) -> Invoice | None:
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
            raise Exception(f"Failed to update invoice status: {e!s}")

    @staticmethod
    def delete_invoice(invoice_id: str) -> bool:
        """Delete an invoice"""
        try:
            collection = get_invoices_collection()
            object_id = ObjectId(invoice_id)

            result = collection.delete_one({"_id": object_id})
            return result.deleted_count > 0

        except Exception as e:
            raise Exception(f"Failed to delete invoice: {e!s}")

    @staticmethod
    def count_invoices() -> int:
        """Count total number of invoices"""
        try:
            collection = get_invoices_collection()
            return collection.count_documents({})
        except Exception as e:
            raise Exception(f"Failed to count invoices: {e!s}")

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
            raise Exception(f"Failed to get total amount for vendor {vendor_name}: {e!s}")

    @staticmethod
    def get_invoices_summary() -> dict[str, Any]:
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
            raise Exception(f"Failed to get invoices summary: {e!s}")

    @staticmethod
    def get_invoices_by_status_count() -> dict[str, int]:
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
            raise Exception(f"Failed to get invoices by status count: {e!s}")

    @staticmethod
    def search_invoices(search_term: str) -> list[Invoice]:
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
            raise Exception(f"Failed to search invoices: {e!s}")
