# MIGRATION.md — Migrating from v1 (Invoice Processing) to v2 (Voynich)

## Overview

This guide covers the incremental migration from the current single-purpose invoice parsing app to the full Ventes/Achats platform. The migration is designed to be non-breaking — existing functionality continues to work throughout.

---

## Step 1: Database Migration Script

Run once to prepare existing data for the new schema.

### Script: `backend/app/migrate_v2.py`

```python
"""
Migration script: v1 → v2
- Sets direction="incoming" on all existing invoices (they were all purchases)
- Copies ice → vendor_ice
- Adds missing fields with defaults
- Creates company_profile collection with indexes
- Creates contacts collection with indexes
"""
from app.database import get_database

def migrate():
    db = get_database()
    invoices = db["invoices"]

    # 1. Set direction on all existing invoices
    result = invoices.update_many(
        {"direction": {"$exists": False}},
        {"$set": {"direction": "incoming"}}
    )
    print(f"Set direction=incoming on {result.modified_count} invoices")

    # 2. Copy ice → vendor_ice where vendor_ice doesn't exist
    for inv in invoices.find({"ice": {"$exists": True}, "vendor_ice": {"$exists": False}}):
        invoices.update_one(
            {"_id": inv["_id"]},
            {"$set": {"vendor_ice": inv.get("ice")}}
        )
    print("Copied ice → vendor_ice")

    # 3. Add new fields with defaults
    invoices.update_many(
        {"subtotal_ht": {"$exists": False}},
        {"$set": {
            "subtotal_ht": None,
            "client_name": None,
            "client_ice": None,
            "contact_id": None,
            "ubl_xml": None,
            "dgi_uuid": None,
            "dgi_status": None,
        }}
    )
    print("Added new fields with defaults")

    # 4. Create company_profile collection
    db.create_collection("company_profile", check_exists=False)
    print("Created company_profile collection")

    # 5. Create contacts collection with indexes
    contacts = db["contacts"]
    contacts.create_index("name")
    contacts.create_index("ice", sparse=True)
    contacts.create_index("contact_type")
    print("Created contacts collection with indexes")

    # 6. Add new indexes on invoices
    invoices.create_index("direction")
    invoices.create_index("client_name")
    invoices.create_index("vendor_ice")
    invoices.create_index("dgi_status", sparse=True)
    print("Added new indexes on invoices")

    print("\nMigration complete.")

if __name__ == "__main__":
    from app.database import init_database
    init_database()
    migrate()
```

**Run**: `python -m app.migrate_v2`

---

## Step 2: Backend Code Migration Order

### 2a. Add new models (additive, nothing breaks)
1. Create `models/company.py` — `CompanyProfile` model
2. Create `models/contact.py` — `Contact` model
3. Update `models/invoice.py` — add new optional fields (all with defaults, backward compatible)

### 2b. Add new database helpers (additive)
4. Add to `database.py`: `get_company_collection()`, `get_contacts_collection()`

### 2c. Add new CRUD (additive)
5. Create `crud/company.py` — `CompanyCRUD` class
6. Create `crud/contact.py` — `ContactCRUD` class

### 2d. Add new routes (additive, existing routes untouched)
7. Create `routes/company.py` — `GET /company`, `PUT /company`
8. Create `routes/contacts.py` — full CRUD for contacts
9. Create `routes/ventes.py` — outgoing invoice routes (wraps invoice CRUD with direction=outgoing)
10. Create `routes/achats.py` — incoming invoice routes (wraps invoice CRUD with direction=incoming)
11. Register new routers in `main.py`

### 2e. Add new services (additive)
12. Create `services/ubl.py` — UBL 2.1 generation (Phase 2)
13. Create `services/pdf_generator.py` — invoice PDF generation (Phase 2)
14. Create `services/numbering.py` — sequential invoice numbering (Phase 2)

---

## Step 3: Frontend Migration Order

### 3a. Navigation restructure
1. Update `constants/index.jsx` — new sidebar items
2. Update `SideBar.jsx` — support nested sections for Ventes/Achats
3. Update `App.jsx` — new route definitions

### 3b. New pages (additive, old pages stay)
4. Create `CompanyProfilePage.jsx`
5. Create `ContactsPage.jsx`
6. Create `VentesListPage.jsx` (can start as a copy of InvoiceListPage filtered to outgoing)
7. Create `AchatsListPage.jsx` (can start as a copy of InvoiceListPage filtered to incoming)
8. Create `VenteCreatePage.jsx` (new emission form)

### 3c. New API clients
9. Create `api/company.js`
10. Create `api/contacts.js`
11. Create `api/ventes.js`
12. Create `api/achats.js`

### 3d. Deprecate old pages (after migration confirmed working)
13. Add redirects from `/invoices/list` → `/achats`
14. Add redirects from `/invoices/add` → `/achats/import`

---

## Step 4: Verification Checklist

After each migration step, verify:

- [ ] All existing invoices still display correctly
- [ ] AI upload still works and creates incoming invoices
- [ ] Manual creation still works
- [ ] Excel export still works
- [ ] Dashboard stats still accurate
- [ ] Auth flow unchanged
- [ ] No console errors in frontend
- [ ] No error logs in backend

---

## Rollback Plan

Since all changes are additive:
- New routes can be removed from `main.py` without affecting old routes
- New fields on invoices have defaults and don't break existing queries
- New collections can be dropped without data loss on invoices
- Frontend old pages remain accessible at old URLs
