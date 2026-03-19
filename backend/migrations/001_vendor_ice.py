"""
Migration 001 — vendor_ice & direction backfill

What it does:
  1. Copies ice → vendor_ice on all documents that have ice but no vendor_ice
  2. Sets direction="incoming" on all documents that have no direction field

Run from the backend/ directory:
    uv run python migrations/001_vendor_ice.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import get_invoices_collection


def run():
    collection = get_invoices_collection()

    # 1. Copy ice → vendor_ice where vendor_ice is missing
    result_ice = collection.update_many(
        {"ice": {"$exists": True, "$ne": None}, "vendor_ice": {"$exists": False}},
        [{"$set": {"vendor_ice": "$ice"}}],
    )
    print(f"[001] Copied ice → vendor_ice on {result_ice.modified_count} document(s).")

    # 2. Set direction="incoming" on docs that have no direction field
    result_dir = collection.update_many(
        {"direction": {"$exists": False}},
        {"$set": {"direction": "incoming"}},
    )
    print(f"[001] Set direction=incoming on {result_dir.modified_count} document(s).")

    print("[001] Migration complete.")


if __name__ == "__main__":
    run()
