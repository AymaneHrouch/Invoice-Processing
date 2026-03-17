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
import random
import sys
from datetime import datetime, timezone, timedelta

random.seed(42)

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import init_database, get_database

UTC = timezone.utc

# Users that appear in seeded history entries
SEED_USERS = ["youness@gmail.com", "aymane@gmail.com", "admin@gmail.com"]


def _user():
    return random.choice(SEED_USERS)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now():
    return datetime.now(UTC)


def _date(days_ago=0):
    return _now() - timedelta(days=days_ago)


def _history(status, direction, inv_date, due_date):
    """Build a realistic audit-trail for a seeded invoice."""
    entries = []

    if status in ("extracted", "draft"):
        return []

    # Validation: 1–3 days after invoice date
    validate_at = inv_date + timedelta(days=random.randint(1, 3))
    status_from = "draft" if direction == "outgoing" else "extracted"
    entries.append({
        "action": "validated",
        "status_from": status_from,
        "status_to": "validated",
        "user": _user(),
        "timestamp": validate_at,
    })

    if status == "validated":
        return entries

    if direction == "outgoing":
        # Sent: 1–4 days after validation
        sent_at = validate_at + timedelta(days=random.randint(1, 4))
        entries.append({
            "action": "sent",
            "status_from": "validated",
            "status_to": "sent",
            "user": _user(),
            "timestamp": sent_at,
        })
        if status == "sent":
            return entries
        # Paid: near due date (±5 days), min 1 day after sent
        base = due_date if due_date else sent_at + timedelta(days=30)
        paid_at = base + timedelta(days=random.randint(-5, 5))
        paid_at = max(paid_at, sent_at + timedelta(days=1))
        entries.append({
            "action": "paid",
            "status_from": "sent",
            "status_to": "paid",
            "user": _user(),
            "timestamp": paid_at,
        })
    else:
        # Incoming paid: near due date, min 1 day after validation
        base = due_date if due_date else validate_at + timedelta(days=30)
        paid_at = base + timedelta(days=random.randint(-5, 5))
        paid_at = max(paid_at, validate_at + timedelta(days=1))
        entries.append({
            "action": "paid",
            "status_from": "validated",
            "status_to": "paid",
            "user": _user(),
            "timestamp": paid_at,
        })

    return entries


def _invoice(
    invoice_number, direction, vendor_name, vendor_ice,
    client_name, client_ice, items, tva, status,
    invoice_date, due_date=None, category="services",
    is_paid=False, currency="MAD",
):
    subtotal = sum(i["quantity"] * i["unit_price"] for i in items)
    tva_amount = round(subtotal * tva / 100, 2)
    total = round(subtotal + tva_amount, 2)
    history = _history(status, direction, invoice_date, due_date)
    last_action_at = history[-1]["timestamp"] if history else _now()
    paid_at = history[-1]["timestamp"] if (history and is_paid) else None
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
        "paid_at": paid_at,
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
        "history": history,
        "created_at": invoice_date,
        "updated_at": last_action_at,
    }


def _make_items(templates, amount_ht):
    """Generate 1–2 realistic line items summing to amount_ht."""
    pool = list(templates)
    if len(pool) >= 2 and amount_ht > 25000:
        t1 = pool[random.randrange(len(pool))]
        pool2 = [t for t in pool if t != t1]
        t2 = pool2[random.randrange(len(pool2))]
        pct = random.randint(55, 72)
        part1 = round(amount_ht * pct / 100 / 500) * 500 or 500
        part2 = amount_ht - part1
        return [
            {"name": t1[0], "description": t1[1], "quantity": 1, "unit_price": part1},
            {"name": t2[0], "description": t2[1], "quantity": 1, "unit_price": part2},
        ]
    t = pool[random.randrange(len(pool))]
    return [{"name": t[0], "description": t[1], "quantity": 1, "unit_price": amount_ht}]


# ── Master data ───────────────────────────────────────────────────────────────

COMPANY_NAME = "Voynich Tech SARL"
COMPANY_ICE  = "001234567000089"

# 25 clients
CLIENTS = [
    ("Maroc Telecom SA",           "001000001000001"),   # 0
    ("OCP Group",                  "001000002000002"),   # 1
    ("Banque Populaire du Maroc",  "002610000000001"),   # 2
    ("Attijariwafa Bank",          "002600000000002"),   # 3
    ("BMCE Bank of Africa",        "002800000000003"),   # 4
    ("Royal Air Maroc",            "001100001000004"),   # 5
    ("ONCF",                       "001300001000005"),   # 6
    ("Lydec",                      "001500001000006"),   # 7
    ("LafargeHolcim Maroc",        "001700001000007"),   # 8
    ("Centrale Danone Maroc",      "001800001000008"),   # 9
    ("Managem Group",              "001900001000009"),   # 10
    ("Wafa Assurance",             "002100001000010"),   # 11
    ("BMCI",                       "002200001000011"),   # 12
    ("Société Générale Maroc",     "002300001000012"),   # 13
    ("Auto Nejma",                 "001200001000013"),   # 14
    ("Renault Maroc",              "001400001000014"),   # 15
    ("inwi",                       "001600001000015"),   # 16
    ("Orange Maroc",               "001600002000016"),   # 17
    ("M2M Group",                  "001700001000017"),   # 18
    ("Ernst & Young Maroc",        "001800001000018"),   # 19
    ("Deloitte Maroc",             "001900001000019"),   # 20
    ("Cabinet Fiduciaire Alami",   "002000001000020"),   # 21
    ("Agence Nationale des Ports", "002100001000021"),   # 22
    ("MASEN",                      "002200001000022"),   # 23
    ("Marsa Maroc",                "002300001000023"),   # 24
]

# 20 suppliers
SUPPLIERS = [
    ("Microsoft Maroc",            "001000003000001"),   # 0
    ("Amazon Web Services",        None),                # 1
    ("Google Cloud EMEA",          None),                # 2
    ("Oracle Maroc",               "001000004000002"),   # 3
    ("SAP Maroc",                  "001000005000003"),   # 4
    ("IBM Maroc",                  "001000006000004"),   # 5
    ("Cisco Systems Maroc",        "001000007000005"),   # 6
    ("Huawei Technologies Maroc",  "001000008000006"),   # 7
    ("Dell Technologies Maroc",    "001000009000007"),   # 8
    ("HP Maroc",                   "001000010000008"),   # 9
    ("Dataprotect",                "001000011000009"),   # 10
    ("HighTech Payment Systems",   "001000012000010"),   # 11
    ("Intelcia Group",             "001000013000011"),   # 12
    ("Manpower Maroc",             "001000014000012"),   # 13
    ("Bureau Veritas Maroc",       "001000015000013"),   # 14
    ("ONEE",                       "001300002000014"),   # 15
    ("Marjane Holding",            "001400002000015"),   # 16
    ("CIH Bank",                   "002500001000016"),   # 17
    ("Wafabail",                   "002600001000017"),   # 18
    ("Riad Bureautique",           "001500002000018"),   # 19
]

SUPPLIER_PREFIXES = [
    "MS", "AWS", "GOOG", "ORC", "SAP", "IBM", "CSC", "HWI",
    "DLL", "HP", "DTP", "HPS", "INT", "MPW", "BVR",
    "ONEE", "MJN", "CIH", "WFB", "RBQ",
]

# Item templates for ventes, by category
VENTE_ITEMS = {
    "services": [
        ("Développement sur mesure", "Selon cahier des charges"),
        ("Intégration API", "Connexion systèmes tiers"),
        ("Migration de données", "Transfert et validation"),
        ("Développement de fonctionnalités", "Sprint agile"),
        ("Mise en production", "Déploiement et tests"),
    ],
    "logiciels": [
        ("Licence plateforme SaaS", "Abonnement annuel"),
        ("Module complémentaire", "Intégration incluse"),
        ("Renouvellement licences", ""),
        ("Solution ERP sur mesure", "Déploiement inclus"),
        ("Logiciel de gestion", "Formation incluse"),
    ],
    "conseil": [
        ("Audit et diagnostic SI", ""),
        ("Étude de cadrage projet", ""),
        ("Accompagnement transformation digitale", ""),
        ("Analyse des besoins", "Rapport inclus"),
        ("Conseil en cybersécurité", ""),
    ],
    "infrastructure": [
        ("Infrastructure cloud managée", "SLA 99.9%"),
        ("Architecture réseau", "Installation incluse"),
        ("Hébergement et supervision", ""),
        ("Migration cloud", ""),
        ("Mise en place VPN", ""),
    ],
    "formation": [
        ("Formation technique spécialisée", ""),
        ("Atelier pratique", "Matériel inclus"),
        ("Programme de certification", ""),
        ("Formation management IT", ""),
        ("E-learning sur mesure", "Accès 12 mois"),
    ],
    "maintenance": [
        ("Contrat de maintenance préventive", "Rapport mensuel"),
        ("Support technique niveau 2", ""),
        ("Maintenance corrective applicative", ""),
        ("Télémaintenance 7j/7", ""),
        ("MCO applicatif", ""),
    ],
    "autre": [
        ("Prestations diverses", ""),
        ("Assistance technique", ""),
        ("Location équipements", ""),
    ],
}

# Item templates for achats, by supplier index
ACHAT_ITEMS = {
    0:  [("Microsoft 365 Business", "Licences utilisateurs"), ("Azure DevOps", "5 utilisateurs"), ("Power BI Premium", ""), ("GitHub Enterprise", "")],
    1:  [("EC2 Compute", "Instances t3.medium"), ("S3 Storage", ""), ("RDS Database", "MySQL managed"), ("CloudFront CDN", ""), ("Lambda Functions", "")],
    2:  [("Google Cloud Compute", ""), ("BigQuery Analytics", ""), ("Cloud Storage", ""), ("Google Workspace", "Licences")],
    3:  [("Oracle Database Enterprise", ""), ("Oracle Cloud Infrastructure", ""), ("Oracle ERP Cloud", "Licences")],
    4:  [("SAP S/4HANA", "Licences utilisateurs"), ("SAP Business One", ""), ("SAP Analytics Cloud", "")],
    5:  [("IBM Watson API", ""), ("IBM Cloud", ""), ("Services professionnels IBM", "")],
    6:  [("Cisco Catalyst Switch", ""), ("Cisco Firewall ASA", ""), ("Webex Meetings", "Licences")],
    7:  [("Huawei Switch Enterprise", ""), ("Huawei Cloud", ""), ("Équipements réseau Huawei", "")],
    8:  [("Serveurs Dell PowerEdge", ""), ("Dell Storage EMC", ""), ("Laptops Dell Latitude", "")],
    9:  [("HP ProLiant Server", ""), ("HP LaserJet réseau", ""), ("HP Workstation", "")],
    10: [("Audit sécurité / pentest", ""), ("SOC as a Service", "Monitoring 24/7"), ("Formation cybersécurité", "")],
    11: [("Solution paiement HPS", "Maintenance annuelle"), ("Intégration API paiement", "")],
    12: [("Externalisation support client", ""), ("BPO services", "")],
    13: [("Mise à disposition personnel IT", ""), ("Recrutement spécialisé", "")],
    14: [("Certification ISO 27001", ""), ("Audit qualité", ""), ("Audit conformité", "")],
    15: [("Consommation électrique", ""), ("Eau potable bureaux", "")],
    16: [("Fournitures de bureau", ""), ("Matériel informatique", "")],
    17: [("Frais bancaires", ""), ("Commission virements", "")],
    18: [("Leasing matériel informatique", "Loyers trimestriels"), ("Crédit-bail équipements", "")],
    19: [("Fournitures de bureau", ""), ("Cartouches imprimante", ""), ("Papeterie et consommables", "")],
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
        "company_name": COMPANY_NAME,
        "legal_form": "SARL",
        "ice": COMPANY_ICE,
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
        "next_invoice_number": 61,
        "invoice_year": _now().year,
        "categories": [
            "services", "logiciels", "conseil", "infrastructure",
            "formation", "maintenance", "autre",
        ],
        "created_at": _now(),
        "updated_at": _now(),
    })
    print("[OK] Company profile inserted.")

    # ── Contacts ──────────────────────────────────────────────────────────────
    contacts = []
    for name, ice in CLIENTS:
        slug = name.lower().replace(" ", "").replace("'", "")[:14]
        contacts.append({
            "name": name,
            "ice": ice,
            "contact_type": ["client"],
            "email": f"facturation@{slug}.ma",
            "phone": None,
            "created_at": _now(),
        })
    for name, ice in SUPPLIERS:
        slug = name.lower().replace(" ", "").replace("'", "")[:14]
        contacts.append({
            "name": name,
            "ice": ice,
            "contact_type": ["supplier"],
            "email": f"billing@{slug}.com",
            "phone": None,
            "created_at": _now(),
        })
    db["contacts"].insert_many(contacts)
    print(f"[OK] {len(contacts)} contacts inserted ({len(CLIENTS)} clients, {len(SUPPLIERS)} fournisseurs).")

    # ── Ventes (outgoing) — 60 invoices ───────────────────────────────────────
    # (client_idx, category, status, days_ago, amount_ht, tva_pct, due_offset)
    # due_offset: invoice_date + due_offset = due_date
    # Negative due_offset means due date is in the future from today.
    VENTES_SPEC = [
        # ── ~12 months ago (330-365 days) — all paid ──────────────────────────
        ( 0, "logiciels",      "paid",  355, 45000, 20, 30),
        ( 1, "conseil",        "paid",  348, 30000, 20, 30),
        ( 4, "infrastructure", "paid",  340, 22000, 20, 30),
        ( 8, "formation",      "paid",  338, 15000, 20, 30),
        ( 2, "services",       "paid",  332, 38000, 20, 30),
        # ── ~11 months ago (295-330) ──────────────────────────────────────────
        ( 3, "logiciels",      "paid",  322, 52000, 20, 30),
        ( 9, "maintenance",    "paid",  315, 18000, 10, 30),
        ( 5, "conseil",        "paid",  308, 25000, 20, 30),
        (11, "infrastructure", "paid",  300, 44000, 20, 45),
        # ── ~10 months ago (260-295) ──────────────────────────────────────────
        ( 6, "logiciels",      "paid",  288, 67000, 20, 30),
        (10, "services",       "paid",  280, 31000, 20, 30),
        ( 0, "formation",      "paid",  272, 21000, 20, 30),
        (12, "conseil",        "paid",  265, 28000, 20, 30),
        # ── ~9 months ago (225-260) ───────────────────────────────────────────
        ( 1, "logiciels",      "paid",  255, 78000, 20, 45),
        ( 7, "conseil",        "paid",  248, 35000, 20, 30),
        (13, "maintenance",    "paid",  240, 19000, 10, 30),
        ( 2, "services",       "paid",  232, 42000, 20, 30),
        # ── ~8 months ago (190-225) ───────────────────────────────────────────
        (14, "logiciels",      "paid",  220, 55000, 20, 30),
        ( 4, "conseil",        "paid",  212, 27000, 20, 30),
        ( 8, "services",       "paid",  205, 36000, 20, 30),
        ( 3, "infrastructure", "paid",  198, 48000, 20, 45),
        # ── ~7 months ago (155-190) ───────────────────────────────────────────
        ( 0, "logiciels",      "paid",  188, 63000, 20, 30),
        (15, "formation",      "paid",  180, 28000, 20, 30),
        ( 9, "services",       "paid",  172, 39000, 20, 30),
        (16, "conseil",        "paid",  165, 32000, 20, 30),
        ( 5, "maintenance",    "paid",  158, 14000, 10, 30),
        # ── ~6 months ago (120-155) ───────────────────────────────────────────
        ( 1, "logiciels",      "paid",  150, 72000, 20, 30),
        (17, "services",       "paid",  142, 41000, 20, 30),
        (10, "infrastructure", "paid",  135, 51000, 20, 45),
        (18, "conseil",        "paid",  128, 29000, 20, 30),
        # ── ~5 months ago (85-120) ────────────────────────────────────────────
        ( 6, "logiciels",      "paid",  118, 58000, 20, 30),
        ( 0, "conseil",        "paid",  110, 34000, 20, 30),
        (19, "services",       "sent",  105, 46000, 20, 30),  # overdue (due 75d ago)
        (11, "formation",      "paid",   92, 24000, 20, 30),
        # ── ~4 months ago (50-85) ─────────────────────────────────────────────
        (20, "logiciels",      "paid",   82, 82000, 20, 30),
        ( 7, "services",       "paid",   75, 37000, 20, 30),
        (13, "conseil",        "sent",   68, 43000, 20, 30),  # overdue (due 38d ago)
        (21, "maintenance",    "paid",   58, 16000, 10, 30),
        # ── ~3 months ago (20-50) ─────────────────────────────────────────────
        (22, "logiciels",      "sent",   48, 66000, 20, 30),  # overdue (due 18d ago)
        ( 1, "services",       "paid",   42, 49000, 20, 30),
        (14, "conseil",        "sent",   38, 31000, 20, 45),  # due in 7 days
        (23, "formation",      "sent",   32, 26000, 20, 45),  # due in 13 days
        ( 3, "infrastructure", "validated", 28, 57000, 20, 45),
        # ── ~2 months ago (8-20) ──────────────────────────────────────────────
        (24, "logiciels",      "sent",   20, 74000, 20, 30),  # due in 10 days
        (15, "services",       "validated", 17, 53000, 20, 30),
        ( 0, "conseil",        "validated", 14, 38000, 20, 30),
        ( 4, "maintenance",    "sent",   11, 17000, 10, 30),  # due in 19 days
        (16, "logiciels",      "validated", 9, 89000, 20, 45),
        # ── Recent (0-8 days) ─────────────────────────────────────────────────
        ( 8, "services",       "validated",  7, 44000, 20, 30),
        (17, "conseil",        "validated",  5, 29000, 20, 30),
        ( 2, "logiciels",      "draft",      4, 61000, 20, 30),
        ( 5, "formation",      "draft",      3, 32000, 20, 30),
        (12, "services",       "draft",      3, 41000, 20, 30),
        ( 9, "infrastructure", "draft",      2, 76000, 20, 30),
        (18, "logiciels",      "draft",      2, 55000, 20, 30),
        (20, "conseil",        "draft",      1, 48000, 20, 30),
        (24, "services",       "draft",      1, 38000, 20, 30),
        (11, "logiciels",      "draft",      0, 92000, 20, 30),
        (23, "maintenance",    "paid",      195, 23000, 10, 30),
        ( 6, "services",       "paid",      145, 34000, 20, 30),
    ]

    ventes = []
    year = _now().year
    for i, (ci, cat, status, days_ago, ht, tva_pct, due_off) in enumerate(VENTES_SPEC, 1):
        c_name, c_ice = CLIENTS[ci]
        inv_date = _date(days_ago)
        due_date = _date(days_ago - due_off) if status != "draft" else None
        items = _make_items(VENTE_ITEMS[cat], ht)
        ventes.append(_invoice(
            invoice_number=f"FAC-{year}-{i:03d}",
            direction="outgoing",
            vendor_name=COMPANY_NAME, vendor_ice=COMPANY_ICE,
            client_name=c_name, client_ice=c_ice,
            items=items, tva=tva_pct, status=status,
            invoice_date=inv_date, due_date=due_date,
            category=cat, is_paid=(status == "paid"),
        ))

    db["invoices"].insert_many(ventes)
    print(f"[OK] {len(ventes)} ventes inserted.")

    # ── Achats (incoming) — 40 invoices ───────────────────────────────────────
    # (supplier_idx, category, status, days_ago, amount_ht, tva_pct, due_offset)
    ACHATS_SPEC = [
        # ── AWS — recurring monthly cloud bill ────────────────────────────────
        ( 1, "infrastructure", "paid",      335, 3800, 0,  15),
        ( 1, "infrastructure", "paid",      305, 4200, 0,  15),
        ( 1, "infrastructure", "paid",      275, 3950, 0,  15),
        ( 1, "infrastructure", "paid",      245, 4500, 0,  15),
        ( 1, "infrastructure", "paid",      215, 4100, 0,  15),
        ( 1, "infrastructure", "paid",      185, 4800, 0,  15),
        ( 1, "infrastructure", "paid",      155, 5200, 0,  15),
        ( 1, "infrastructure", "paid",      125, 4900, 0,  15),
        ( 1, "infrastructure", "validated",  65, 5500, 0,  15),
        ( 1, "infrastructure", "extracted",  18, 5100, 0,  15),
        # ── Microsoft — semi-annual license renewal ───────────────────────────
        ( 0, "logiciels",      "paid",      310, 12000, 20, 30),
        ( 0, "logiciels",      "paid",      130, 14400, 20, 30),
        ( 0, "logiciels",      "extracted",  12, 14400, 20, 30),
        # ── Google Cloud — quarterly ──────────────────────────────────────────
        ( 2, "infrastructure", "paid",      280,  6500, 0,  15),
        ( 2, "infrastructure", "paid",      185,  7200, 0,  15),
        ( 2, "infrastructure", "validated",  88,  7800, 0,  15),
        ( 2, "infrastructure", "extracted",   8,  8100, 0,  15),
        # ── Oracle — annual license ───────────────────────────────────────────
        ( 3, "logiciels",      "paid",      320, 85000, 20, 60),
        # ── SAP — annual license ──────────────────────────────────────────────
        ( 4, "logiciels",      "paid",      295, 72000, 20, 60),
        ( 4, "logiciels",      "extracted",  22, 76000, 20, 60),
        # ── IBM — consulting ──────────────────────────────────────────────────
        ( 5, "services",       "paid",      252, 38000, 20, 45),
        ( 5, "services",       "validated",  58, 42000, 20, 45),
        # ── Cisco — networking ────────────────────────────────────────────────
        ( 6, "infrastructure", "paid",      268, 55000, 20, 45),
        ( 6, "infrastructure", "validated",  42, 28000, 20, 45),
        # ── Dell — hardware ───────────────────────────────────────────────────
        ( 8, "infrastructure", "paid",      228, 92000, 20, 45),
        # ── HP — hardware ─────────────────────────────────────────────────────
        ( 9, "infrastructure", "paid",      178, 34000, 20, 30),
        # ── Dataprotect — cybersecurity ───────────────────────────────────────
        (10, "services",       "paid",      312, 28000, 20, 30),
        (10, "services",       "validated",  72, 32000, 20, 30),
        # ── HPS — payment platform ────────────────────────────────────────────
        (11, "services",       "paid",      200, 45000, 20, 30),
        # ── Intelcia — BPO ────────────────────────────────────────────────────
        (12, "services",       "paid",      338, 36000, 20, 30),
        (12, "services",       "paid",      158, 38000, 20, 30),
        (12, "services",       "extracted",  15, 39000, 20, 30),
        # ── Manpower — HR ─────────────────────────────────────────────────────
        (13, "services",       "paid",      258, 24000, 20, 30),
        (13, "services",       "validated",  52, 26000, 20, 30),
        # ── Bureau Veritas — certification ────────────────────────────────────
        (14, "services",       "paid",      318, 18000, 20, 30),
        # ── ONEE — utilities ──────────────────────────────────────────────────
        (15, "autre",          "paid",      322,  4200, 14, 15),
        (15, "autre",          "paid",      202,  3800, 14, 15),
        (15, "autre",          "extracted",  16,  4100, 14, 15),
        # ── Wafabail — leasing ────────────────────────────────────────────────
        (18, "infrastructure", "paid",      352, 15000, 10, 30),
        (18, "infrastructure", "paid",      172, 15000, 10, 30),
    ]

    achat_counters = {}
    achats = []
    for sup_idx, cat, status, days_ago, ht, tva_pct, due_off in ACHATS_SPEC:
        s_name, s_ice = SUPPLIERS[sup_idx]
        prefix = SUPPLIER_PREFIXES[sup_idx]
        achat_counters[sup_idx] = achat_counters.get(sup_idx, 0) + 1
        inv_num = f"{prefix}-{year}-{achat_counters[sup_idx]:04d}"
        inv_date = _date(days_ago)
        due_date = _date(days_ago - due_off) if status != "extracted" else None
        items = _make_items(ACHAT_ITEMS[sup_idx], ht)
        achats.append(_invoice(
            invoice_number=inv_num,
            direction="incoming",
            vendor_name=s_name, vendor_ice=s_ice,
            client_name=COMPANY_NAME, client_ice=COMPANY_ICE,
            items=items, tva=tva_pct, status=status,
            invoice_date=inv_date, due_date=due_date,
            category=cat, is_paid=(status == "paid"),
        ))

    db["invoices"].insert_many(achats)
    print(f"[OK] {len(achats)} achats inserted.")

    total = len(ventes) + len(achats)
    print(f"\n[OK] Total: {total} invoices ({len(ventes)} ventes, {len(achats)} achats).")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Reset the Voynich database.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--empty", action="store_true", help="Wipe all data, no seed.")
    group.add_argument("--seed",  action="store_true", help="Wipe + insert demo data.")
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
