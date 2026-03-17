"""
reset.py — Wipe and optionally reseed the database.

Usage (from backend/ directory):
    uv run python scripts/reset.py --empty   # wipe only
    uv run python scripts/reset.py --seed    # wipe + insert demo data

Via Docker:
    docker exec <container> uv run python scripts/reset.py --seed
"""
import argparse
import os
import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import init_database, get_database

UTC = timezone.utc


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now():
    return datetime.now(UTC)

def _date(days_ago=0):
    return _now() - timedelta(days=days_ago)

def _invoice(
    invoice_number, direction, vendor_name, vendor_ice,
    client_name, client_ice, items, tva, status,
    invoice_date, due_date=None, category="services",
    is_paid=False, currency="MAD",
):
    subtotal = sum(i["quantity"] * i["unit_price"] for i in items)
    tva_amount = round(subtotal * tva / 100, 2)
    total = round(subtotal + tva_amount, 2)
    return {
        "invoice_number": invoice_number,
        "direction": direction,
        "vendor_name": vendor_name,
        "vendor_ice": vendor_ice,
        "client_name": client_name,
        "client_ice": client_ice,
        "invoice_date": invoice_date,
        "invoice_due_date": due_date,
        "status": status,
        "is_paid": is_paid,
        "is_archived": False,
        "is_exported": False,
        "currency": currency,
        "category": category,
        "tva": float(tva),
        "amount_tva": float(tva_amount),
        "subtotal_ht": float(subtotal),
        "total_amount": float(total),
        "items": [
            {
                "name": i["name"],
                "description": i.get("description", ""),
                "quantity": i["quantity"],
                "unit_price": float(i["unit_price"]),
                "total": float(round(i["quantity"] * i["unit_price"], 2)),
            }
            for i in items
        ],
        "tags": [],
        "source_type": "manual",
        "created_at": _now(),
        "updated_at": _now(),
    }


# ── Reset ─────────────────────────────────────────────────────────────────────

def reset(db):
    db["invoices"].drop()
    db["company_profile"].drop()
    db["contacts"].drop()
    db["cache"].drop()
    print("[OK] Collections dropped.")


# ── Seed ──────────────────────────────────────────────────────────────────────

def seed(db):
    # ── Company profile ───────────────────────────────────────────────────────
    db["company_profile"].insert_one({
        "company_name": "Voynich Tech SARL",
        "legal_form": "SARL",
        "ice": "001234567000089",
        "identifiant_fiscal": "12345678",
        "rc": "123456",
        "patente": "12345678",
        "cnss": "1234567",
        "address": "123 Boulevard Zerktouni, Bureau 5",
        "postal_code": "20000",
        "city": "Casablanca",
        "phone": "+212 522 000 000",
        "email": "contact@voynich.ma",
        "bank_name": "Attijariwafa Bank",
        "bank_account": "007 780 0001234567890 12",
        "invoice_prefix": "FAC",
        "next_invoice_number": 6,
        "invoice_year": _now().year,
        "categories": [
            "services", "logiciels", "conseil", "infrastructure",
            "formation", "maintenance", "autre"
        ],
        "created_at": _now(),
        "updated_at": _now(),
    })
    print("[OK] Company profile inserted.")

    # ── Contacts ──────────────────────────────────────────────────────────────
    contacts = [
        {
            "name": "Maroc Telecom SA",
            "ice": "001000001000001",
            "contact_type": ["client"],
            "email": "facturation@iam.ma",
            "phone": "+212 537 000 000",
            "created_at": _now(),
        },
        {
            "name": "OCP Group",
            "ice": "001000002000002",
            "contact_type": ["client"],
            "email": "achats@ocpgroup.ma",
            "phone": "+212 523 000 000",
            "created_at": _now(),
        },
        {
            "name": "Microsoft Maroc",
            "ice": "001000003000003",
            "contact_type": ["supplier"],
            "email": "billing@microsoft.ma",
            "phone": "+212 522 111 111",
            "created_at": _now(),
        },
        {
            "name": "Amazon Web Services",
            "ice": None,
            "contact_type": ["supplier"],
            "email": "aws-billing@amazon.com",
            "phone": None,
            "created_at": _now(),
        },
        {
            "name": "Bureau de Poste Maroc",
            "ice": "001000005000005",
            "contact_type": ["supplier", "client"],
            "email": "contact@poste.ma",
            "phone": "+212 537 222 222",
            "created_at": _now(),
        },
    ]
    db["contacts"].insert_many(contacts)
    print(f"[OK] {len(contacts)} contacts inserted.")

    # ── Invoices ──────────────────────────────────────────────────────────────
    invoices = [
        # ── Ventes (outgoing) ─────────────────────────────────────────────────
        _invoice(
            invoice_number="FAC-2026-001",
            direction="outgoing",
            vendor_name="Voynich Tech SARL",
            vendor_ice="001234567000089",
            client_name="Maroc Telecom SA",
            client_ice="001000001000001",
            items=[
                {"name": "Développement application mobile", "description": "Sprint 1 & 2", "quantity": 1, "unit_price": 45000},
                {"name": "Hébergement cloud", "description": "3 mois", "quantity": 3, "unit_price": 2500},
            ],
            tva=20, status="paid", is_paid=True,
            invoice_date=_date(60), due_date=_date(30),
            category="logiciels",
        ),
        _invoice(
            invoice_number="FAC-2026-002",
            direction="outgoing",
            vendor_name="Voynich Tech SARL",
            vendor_ice="001234567000089",
            client_name="OCP Group",
            client_ice="001000002000002",
            items=[
                {"name": "Audit système d'information", "quantity": 1, "unit_price": 30000},
                {"name": "Rapport de recommandations", "quantity": 1, "unit_price": 8000},
            ],
            tva=20, status="sent",
            invoice_date=_date(30), due_date=_date(0),
            category="conseil",
        ),
        _invoice(
            invoice_number="FAC-2026-003",
            direction="outgoing",
            vendor_name="Voynich Tech SARL",
            vendor_ice="001234567000089",
            client_name="Maroc Telecom SA",
            client_ice="001000001000001",
            items=[
                {"name": "Formation DevOps", "description": "5 jours × 2 formateurs", "quantity": 10, "unit_price": 3500},
            ],
            tva=20, status="validated",
            invoice_date=_date(10), due_date=_date(-20),
            category="formation",
        ),
        _invoice(
            invoice_number="FAC-2026-004",
            direction="outgoing",
            vendor_name="Voynich Tech SARL",
            vendor_ice="001234567000089",
            client_name="Bureau de Poste Maroc",
            client_ice="001000005000005",
            items=[
                {"name": "Maintenance corrective", "quantity": 1, "unit_price": 12000},
            ],
            tva=10, status="draft",
            invoice_date=_date(2),
            category="maintenance",
        ),
        _invoice(
            invoice_number="FAC-2026-005",
            direction="outgoing",
            vendor_name="Voynich Tech SARL",
            vendor_ice="001234567000089",
            client_name="OCP Group",
            client_ice="001000002000002",
            items=[
                {"name": "Licence plateforme SaaS", "description": "Abonnement annuel", "quantity": 1, "unit_price": 60000},
                {"name": "Support premium", "quantity": 12, "unit_price": 1500},
            ],
            tva=20, status="paid", is_paid=True,
            invoice_date=_date(90), due_date=_date(60),
            category="logiciels",
        ),

        # ── Achats (incoming) ─────────────────────────────────────────────────
        _invoice(
            invoice_number="MS-2026-00124",
            direction="incoming",
            vendor_name="Microsoft Maroc",
            vendor_ice="001000003000003",
            client_name="Voynich Tech SARL",
            client_ice="001234567000089",
            items=[
                {"name": "Microsoft 365 Business", "description": "10 licences × 12 mois", "quantity": 10, "unit_price": 1200},
            ],
            tva=20, status="validated", is_paid=True,
            invoice_date=_date(45), due_date=_date(15),
            category="logiciels",
        ),
        _invoice(
            invoice_number="AWS-INV-2026-0391",
            direction="incoming",
            vendor_name="Amazon Web Services",
            vendor_ice=None,
            client_name="Voynich Tech SARL",
            client_ice="001234567000089",
            items=[
                {"name": "EC2 instances", "description": "t3.medium × 2", "quantity": 1, "unit_price": 3200},
                {"name": "S3 Storage", "description": "500GB", "quantity": 1, "unit_price": 450},
                {"name": "CloudFront CDN", "quantity": 1, "unit_price": 280},
            ],
            tva=0, status="validated", is_paid=True,
            invoice_date=_date(30), due_date=_date(0),
            category="infrastructure",
        ),
        _invoice(
            invoice_number="AWS-INV-2026-0412",
            direction="incoming",
            vendor_name="Amazon Web Services",
            vendor_ice=None,
            client_name="Voynich Tech SARL",
            client_ice="001234567000089",
            items=[
                {"name": "EC2 instances", "description": "t3.medium × 2", "quantity": 1, "unit_price": 3400},
                {"name": "S3 Storage", "description": "520GB", "quantity": 1, "unit_price": 470},
                {"name": "RDS Database", "quantity": 1, "unit_price": 1200},
            ],
            tva=0, status="extracted",
            invoice_date=_date(5),
            category="infrastructure",
        ),
        _invoice(
            invoice_number="PTT-2026-00089",
            direction="incoming",
            vendor_name="Bureau de Poste Maroc",
            vendor_ice="001000005000005",
            client_name="Voynich Tech SARL",
            client_ice="001234567000089",
            items=[
                {"name": "Envois recommandés", "quantity": 24, "unit_price": 35},
                {"name": "Location boîte postale", "quantity": 1, "unit_price": 600},
            ],
            tva=14, status="validated", is_paid=False,
            invoice_date=_date(20), due_date=_date(-10),
            category="autre",
        ),
        _invoice(
            invoice_number="MS-2026-00156",
            direction="incoming",
            vendor_name="Microsoft Maroc",
            vendor_ice="001000003000003",
            client_name="Voynich Tech SARL",
            client_ice="001234567000089",
            items=[
                {"name": "Azure DevOps", "description": "5 utilisateurs", "quantity": 5, "unit_price": 800},
                {"name": "GitHub Enterprise", "quantity": 5, "unit_price": 950},
            ],
            tva=20, status="extracted",
            invoice_date=_date(3),
            category="logiciels",
        ),
    ]

    db["invoices"].insert_many(invoices)
    print(f"[OK] {len(invoices)} invoices inserted (5 ventes, 5 achats).")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Reset the Voynich database.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--empty", action="store_true", help="Wipe all data, no seed.")
    group.add_argument("--seed", action="store_true", help="Wipe + insert demo data.")
    args = parser.parse_args()

    print("Connecting to database...")
    if not init_database():
        print("[ERR] Could not connect to database. Check your .env / MONGO_URL.")
        sys.exit(1)

    db = get_database()

    print("Resetting collections...")
    reset(db)

    if args.seed:
        print("Seeding demo data...")
        seed(db)
        print("\nDone. You can now log in and see demo data.")
    else:
        print("\nDone. Database is empty and ready for a fresh demo.")


if __name__ == "__main__":
    main()
