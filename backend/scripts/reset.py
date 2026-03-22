"""
reset.py — Wipe and optionally reseed the database.

Usage (from backend/ directory):
    uv run python scripts/reset.py --empty   # wipe only
    uv run python scripts/reset.py --seed    # wipe + insert demo data

Via Docker:
    docker exec <container> uv run python scripts/reset.py --seed
"""
import argparse
from datetime import UTC, datetime, timedelta
import os
import random
import sys

random.seed(42)

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv

load_dotenv()

from app.database import get_database, init_database

SEED_USERS = ["youness@gmail.com", "aymane@gmail.com", "demo@voynich.ma"]


def _user():
    return random.choice(SEED_USERS)


def _now():
    return datetime.now(UTC)


def _date(days_ago=0):
    return _now() - timedelta(days=days_ago)


def _history(status, direction, inv_date, due_date):
    entries = []
    if status in ("extracted", "draft"):
        return []

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
    currency="MAD", company_id=None,
    is_exported=False,
):
    subtotal = sum(i["quantity"] * i["unit_price"] for i in items)
    tva_amount = round(subtotal * tva / 100, 2)
    total = round(subtotal + tva_amount, 2)
    history = _history(status, direction, invoice_date, due_date)
    last_action_at = history[-1]["timestamp"] if history else _now()
    paid_at = history[-1]["timestamp"] if (history and status == "paid") else None
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
        "paid_at": paid_at,
        "is_archived": False,
        "is_exported": is_exported,
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
        "source_type": "manual",
        "history": history,
        "created_at": invoice_date,
        "updated_at": last_action_at,
        **({"company_id": company_id} if company_id else {}),
    }


def _make_items(templates, amount_ht):
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


# ── Master data ────────────────────────────────────────────────────────────────

COMPANY_NAME = "Voynich Tech SARL"
COMPANY_ICE  = "001234567000089"

CLIENTS = [
    ("Maroc Telecom SA",           "001000001000001", "+212 537 71 41 00", "Rabat",       "Avenue Annakhil, Hay Riad"),
    ("OCP Group",                  "001000002000002", "+212 523 00 28 28", "Casablanca",  "2 Rue Al Abtal, Hay Erraha"),
    ("Banque Populaire du Maroc",  "002610000000001", "+212 522 20 25 00", "Casablanca",  "101 Boulevard Zerktouni"),
    ("Attijariwafa Bank",          "002600000000002", "+212 522 29 88 88", "Casablanca",  "2 Boulevard Moulay Youssef"),
    ("BMCE Bank of Africa",        "002800000000003", "+212 522 49 80 00", "Casablanca",  "140 Avenue Hassan II"),
    ("Royal Air Maroc",            "001100001000004", "+212 522 48 97 97", "Casablanca",  "Aéroport Mohammed V"),
    ("ONCF",                       "001300001000005", "+212 537 77 47 47", "Rabat",       "8 bis Rue Abderrahmane El Ghafiki"),
    ("Lydec",                      "001500001000006", "+212 522 54 90 00", "Casablanca",  "48 Rue Mohamed Diouri"),
    ("LafargeHolcim Maroc",        "001700001000007", "+212 522 23 28 00", "Casablanca",  "Route de Rabat, Km 12"),
    ("Centrale Danone Maroc",      "001800001000008", "+212 522 67 10 00", "Casablanca",  "Bouskoura, Zone Industrielle"),
    ("Managem Group",              "001900001000009", "+212 522 23 26 00", "Casablanca",  "Twin Center, Tour Ouest"),
    ("Wafa Assurance",             "002100001000010", "+212 522 54 55 55", "Casablanca",  "1 Boulevard Abdelmoumen"),
    ("BMCI",                       "002200001000011", "+212 522 66 52 00", "Casablanca",  "26 Place des Nations Unies"),
    ("Société Générale Maroc",     "002300001000012", "+212 522 43 88 00", "Casablanca",  "55 Boulevard Abdelmoumen"),
    ("Auto Nejma",                 "001200001000013", "+212 522 54 10 00", "Casablanca",  "Route de l'Aéroport"),
    ("Renault Maroc",              "001400001000014", "+212 522 30 50 00", "Casablanca",  "Route de Rabat, Ain Sebaa"),
    ("inwi",                       "001600001000015", "+212 522 80 00 00", "Casablanca",  "82 Boulevard d'Anfa"),
    ("Orange Maroc",               "001600002000016", "+212 522 97 00 00", "Casablanca",  "Avenue Annakhil, Hay Riad"),
    ("M2M Group",                  "001700001000017", "+212 522 77 60 00", "Casablanca",  "Technopark Casablanca"),
    ("Ernst & Young Maroc",        "001800001000018", "+212 522 95 79 00", "Casablanca",  "37 Boulevard Abdellatif Ben Kaddour"),
    ("Deloitte Maroc",             "001900001000019", "+212 522 22 40 00", "Casablanca",  "288 Boulevard Zerktouni"),
    ("Cabinet Fiduciaire Alami",   "002000001000020", "+212 537 72 11 00", "Rabat",       "14 Rue Jaâfar Assadik, Agdal"),
    ("Agence Nationale des Ports", "002100001000021", "+212 522 23 16 10", "Casablanca",  "Boulevard de la Résistance"),
    ("MASEN",                      "002200001000022", "+212 537 71 85 00", "Rabat",       "Immeuble Le Mirador, Hay Riad"),
    ("Marsa Maroc",                "002300001000023", "+212 522 23 24 24", "Casablanca",  "175 Boulevard Zerktouni"),
]

SUPPLIERS = [
    ("Microsoft Maroc",            "001000003000001", "+212 522 97 09 00", "Casablanca",  "Technopark, Route de Nouaceur"),
    ("Amazon Web Services",        None,              "+1 206 266 1000",   "Seattle",     "410 Terry Ave N"),
    ("Google Cloud EMEA",          None,              "+353 1 543 1000",   "Dublin",      "Gordon House, Barrow Street"),
    ("Oracle Maroc",               "001000004000002", "+212 522 36 87 00", "Casablanca",  "Boulevard Sidi Abderrahmane"),
    ("SAP Maroc",                  "001000005000003", "+212 522 97 24 00", "Casablanca",  "Technopark, Route de Nouaceur"),
    ("IBM Maroc",                  "001000006000004", "+212 522 97 30 00", "Casablanca",  "Lotissement Attaoufik, Sidi Maârouf"),
    ("Cisco Systems Maroc",        "001000007000005", "+212 522 97 50 00", "Casablanca",  "Technopark, Route de Nouaceur"),
    ("Huawei Technologies Maroc",  "001000008000006", "+212 522 97 60 00", "Casablanca",  "Avenue Moulay Hassan II"),
    ("Dell Technologies Maroc",    "001000009000007", "+212 522 97 70 00", "Casablanca",  "Technopark, Route de Nouaceur"),
    ("HP Maroc",                   "001000010000008", "+212 522 97 80 00", "Casablanca",  "Lotissement Attaoufik, Sidi Maârouf"),
    ("Dataprotect",                "001000011000009", "+212 522 52 00 52", "Casablanca",  "16 Rue Socrate, Racine"),
    ("HighTech Payment Systems",   "001000012000010", "+212 522 90 30 00", "Casablanca",  "37 Rue Ibnou Majid El Bahar"),
    ("Intelcia Group",             "001000013000011", "+212 522 78 30 00", "Casablanca",  "Route de Nouaceur, Sidi Maârouf"),
    ("Manpower Maroc",             "001000014000012", "+212 522 94 06 00", "Casablanca",  "Immeuble Mimouna, Boulevard Zerktouni"),
    ("Bureau Veritas Maroc",       "001000015000013", "+212 522 36 60 00", "Casablanca",  "Lotissement Attaoufik, Sidi Maârouf"),
    ("ONEE",                       "001300002000014", "+212 537 66 80 00", "Rabat",       "65 Rue Othman Ben Affane"),
    ("Marjane Holding",            "001400002000015", "+212 522 86 00 00", "Casablanca",  "Route de Kénitra, Ain Sebaa"),
    ("CIH Bank",                   "002500001000016", "+212 522 46 44 00", "Casablanca",  "187 Avenue Hassan II"),
    ("Wafabail",                   "002600001000017", "+212 522 54 80 00", "Casablanca",  "Avenue Hassan II, Immeuble Wafa"),
    ("Riad Bureautique",           "001500002000018", "+212 522 30 11 00", "Casablanca",  "68 Boulevard d'Anfa"),
]

SUPPLIER_PREFIXES = [
    "MS", "AWS", "GOOG", "ORC", "SAP", "IBM", "CSC", "HWI",
    "DLL", "HP", "DTP", "HPS", "INT", "MPW", "BVR",
    "ONEE", "MJN", "CIH", "WFB", "RBQ",
]

VENTE_ITEMS = {
    "services":       [("Développement sur mesure", "Selon cahier des charges"), ("Intégration API", "Connexion systèmes tiers"), ("Migration de données", "Transfert et validation"), ("Développement de fonctionnalités", "Sprint agile"), ("Mise en production", "Déploiement et tests")],
    "logiciels":      [("Licence plateforme SaaS", "Abonnement annuel"), ("Module complémentaire", "Intégration incluse"), ("Renouvellement licences", ""), ("Solution ERP sur mesure", "Déploiement inclus"), ("Logiciel de gestion", "Formation incluse")],
    "conseil":        [("Audit et diagnostic SI", ""), ("Étude de cadrage projet", ""), ("Accompagnement transformation digitale", ""), ("Analyse des besoins", "Rapport inclus"), ("Conseil en cybersécurité", "")],
    "infrastructure": [("Infrastructure cloud managée", "SLA 99.9%"), ("Architecture réseau", "Installation incluse"), ("Hébergement et supervision", ""), ("Migration cloud", ""), ("Mise en place VPN", "")],
    "formation":      [("Formation technique spécialisée", ""), ("Atelier pratique", "Matériel inclus"), ("Programme de certification", ""), ("Formation management IT", ""), ("E-learning sur mesure", "Accès 12 mois")],
    "maintenance":    [("Contrat de maintenance préventive", "Rapport mensuel"), ("Support technique niveau 2", ""), ("Maintenance corrective applicative", ""), ("Télémaintenance 7j/7", ""), ("MCO applicatif", "")],
    "autre":          [("Prestations diverses", ""), ("Assistance technique", ""), ("Location équipements", "")],
}

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

# Ventes: client weights — some clients are regulars, others occasional
# (client_idx, weight, category, base_amount_ht, tva_pct, due_days)
VENTE_PROFILES = [
    (0,  8, "logiciels",      45000, 20, 30),
    (1,  7, "conseil",        32000, 20, 30),
    (2,  6, "services",       38000, 20, 30),
    (3,  5, "logiciels",      55000, 20, 30),
    (4,  5, "infrastructure", 22000, 20, 45),
    (5,  4, "maintenance",    14000, 10, 30),
    (6,  4, "logiciels",      67000, 20, 30),
    (7,  3, "conseil",        35000, 20, 30),
    (8,  3, "services",       44000, 20, 30),
    (9,  3, "formation",      21000, 20, 30),
    (10, 2, "services",       31000, 20, 30),
    (11, 2, "infrastructure", 48000, 20, 45),
    (12, 2, "conseil",        28000, 20, 30),
    (13, 2, "maintenance",    19000, 10, 30),
    (14, 1, "logiciels",      58000, 20, 30),
    (15, 1, "formation",      26000, 20, 30),
    (16, 1, "conseil",        33000, 20, 30),
    (17, 1, "services",       41000, 20, 30),
    (18, 1, "infrastructure", 51000, 20, 45),
    (19, 1, "logiciels",      74000, 20, 30),
    (20, 1, "logiciels",      82000, 20, 30),
    (21, 1, "maintenance",    16000, 10, 30),
    (22, 1, "logiciels",      66000, 20, 30),
    (23, 1, "formation",      26000, 20, 45),
    (24, 1, "logiciels",      89000, 20, 45),
]

# Achats: recurring supplier patterns
# (supplier_idx, category, base_amount_ht, tva_pct, due_days, frequency_months)
# frequency_months=1 → monthly, 3 → quarterly, 6 → semi-annual, 12 → annual
ACHAT_PROFILES = [
    (1,  "infrastructure", 4500,  0,  15, 1),   # AWS — monthly cloud
    (2,  "infrastructure", 7200,  0,  15, 1),   # Google Cloud — monthly
    (15, "autre",          4000,  14, 15, 1),   # ONEE — monthly utilities
    (19, "autre",          1200,  20, 15, 1),   # Riad Bureautique — monthly office supplies
    (0,  "logiciels",      13000, 20, 30, 3),   # Microsoft — quarterly
    (12, "services",       37000, 20, 30, 3),   # Intelcia — quarterly BPO
    (13, "services",       25000, 20, 30, 3),   # Manpower — quarterly HR
    (6,  "infrastructure", 28000, 20, 45, 3),   # Cisco — quarterly network
    (5,  "services",       40000, 20, 45, 3),   # IBM — quarterly consulting
    (10, "services",       30000, 20, 30, 6),   # Dataprotect — semi-annual
    (11, "services",       45000, 20, 30, 6),   # HPS — semi-annual
    (18, "infrastructure", 15000, 10, 30, 6),   # Wafabail — semi-annual leasing
    (8,  "infrastructure", 92000, 20, 45, 12),  # Dell — annual hardware
    (9,  "infrastructure", 34000, 20, 30, 12),  # HP — annual hardware
    (3,  "logiciels",      85000, 20, 60, 12),  # Oracle — annual license
    (4,  "logiciels",      72000, 20, 60, 12),  # SAP — annual license
    (14, "services",       18000, 20, 30, 12),  # Bureau Veritas — annual audit
]


def _month_start(days_ago_approx):
    """Return datetime at the start of the month for approximately days_ago days ago."""
    d = _now() - timedelta(days=days_ago_approx)
    return datetime(d.year, d.month, 1, tzinfo=UTC)


def _rand_day_in_month(month_start_dt):
    """Return a random working day within the month."""
    import calendar
    month = month_start_dt.month
    year = month_start_dt.year
    last_day = calendar.monthrange(year, month)[1]
    day = random.randint(1, last_day)
    return month_start_dt.replace(day=day)


def _jitter(base_amount, pct=0.25):
    """Add ±pct% random variation to an amount, rounded to 500."""
    factor = 1 + random.uniform(-pct, pct)
    raw = base_amount * factor
    return max(500, round(raw / 500) * 500)


# ── Reset ─────────────────────────────────────────────────────────────────────

def reset(db):
    db["invoices"].drop()
    db["company_profile"].drop()
    db["contacts"].drop()
    db["cache"].drop()
    db["firms"].drop()
    db["users"].delete_many({"role": {"$ne": "ADMIN"}})
    print("[OK] Collections dropped.")


# ── Seed ──────────────────────────────────────────────────────────────────────

FIRM_ADMIN_EMAIL    = "demo@voynich.ma"
FIRM_ADMIN_PASSWORD = "demo1234"
FIRM_ADMIN_NAME     = "Demo Admin"
FIRM_NAME           = "Cabinet Voynich Demo"

MONTHS_BACK = 12   # how many months of history to generate


def seed(db):
    import bcrypt

    # ── Demo firm ─────────────────────────────────────────────────────────────
    firm_result = db["firms"].insert_one({
        "name": FIRM_NAME,
        "created_at": _now(),
        "auto_created": False,
    })
    FIRM_ID = str(firm_result.inserted_id)
    print(f"[OK] Demo firm inserted (id={FIRM_ID}).")

    # ── Firm admin ────────────────────────────────────────────────────────────
    hashed = bcrypt.hashpw(FIRM_ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
    db["users"].insert_one({
        "full_name": FIRM_ADMIN_NAME,
        "email": FIRM_ADMIN_EMAIL,
        "hashed_password": hashed,
        "role": "FIRM_ADMIN",
        "firm_id": FIRM_ID,
    })
    print(f"[OK] Firm admin created: {FIRM_ADMIN_EMAIL} / {FIRM_ADMIN_PASSWORD}")

    # ── Company profile ───────────────────────────────────────────────────────
    company_result = db["company_profile"].insert_one({
        "firm_id": FIRM_ID,
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
        "next_invoice_number": 1,
        "invoice_year": _now().year,
        "categories": ["services", "logiciels", "conseil", "infrastructure", "formation", "maintenance", "autre"],
        "created_at": _now(),
        "updated_at": _now(),
    })
    COMPANY_ID = str(company_result.inserted_id)
    print(f"[OK] Company profile inserted (id={COMPANY_ID}).")

    # ── Contacts ──────────────────────────────────────────────────────────────
    contacts = []
    for name, ice, phone, city, address in CLIENTS:
        slug = name.lower().replace(" ", "").replace("'", "")[:14]
        contacts.append({
            "name": name, "ice": ice, "contact_type": ["client"],
            "email": f"facturation@{slug}.ma", "phone": phone,
            "city": city, "address": address,
            "company_id": COMPANY_ID, "created_at": _now(),
        })
    for name, ice, phone, city, address in SUPPLIERS:
        slug = name.lower().replace(" ", "").replace("'", "")[:14]
        tld = "com" if city not in ("Casablanca", "Rabat") else "ma"
        contacts.append({
            "name": name, "ice": ice, "contact_type": ["supplier"],
            "email": f"billing@{slug}.{tld}", "phone": phone,
            "city": city, "address": address,
            "company_id": COMPANY_ID, "created_at": _now(),
        })
    db["contacts"].insert_many(contacts)
    print(f"[OK] {len(contacts)} contacts inserted.")

    # ── Generate Ventes (outgoing) via weighted monthly loop ──────────────────
    # Build weighted pool of client profiles
    weighted_pool = []
    for prof in VENTE_PROFILES:
        weighted_pool.extend([prof] * prof[1])  # weight = number of times in pool

    ventes = []
    vente_counter = 0
    year = _now().year

    for month_offset in range(MONTHS_BACK - 1, -1, -1):
        # month_offset=11 → 11 months ago, 0 → current month
        days_ago_approx = month_offset * 30 + 15
        month_dt = _month_start(days_ago_approx)

        # Monthly invoice count: more in recent months, natural variation
        base_count = 5 + random.randint(0, 4)
        # Slight growth trend: more invoices in recent months
        growth = int((MONTHS_BACK - month_offset) * 0.3)
        n_invoices = base_count + growth

        # Sample without replacement from weighted pool
        sample = random.choices(weighted_pool, k=n_invoices)

        for ci, _w, cat, base_ht, tva_pct, due_days in sample:
            c_name, c_ice, *_ = CLIENTS[ci]
            inv_date = _rand_day_in_month(month_dt)
            amount_ht = _jitter(base_ht)

            # Status logic based on age
            is_current_month = (month_offset == 0)
            is_last_month = (month_offset == 1)

            if is_current_month:
                # Mix of draft, validated, sent for current month
                status = random.choices(["draft", "validated", "sent"], weights=[4, 3, 2])[0]
                due_date = inv_date + timedelta(days=due_days) if status != "draft" else None
            elif is_last_month:
                # Some sent (not yet paid), some validated, some already paid
                status = random.choices(["validated", "sent", "paid"], weights=[2, 3, 5])[0]
                due_date = inv_date + timedelta(days=due_days)
            else:
                # Older months: mostly paid, some sent (overdue)
                # Intentionally leave ~15% unpaid for overdue alerts
                if month_offset <= 3:
                    status = random.choices(["paid", "sent"], weights=[85, 15])[0]
                else:
                    status = random.choices(["paid", "sent"], weights=[93, 7])[0]
                due_date = inv_date + timedelta(days=due_days)

            vente_counter += 1
            items = _make_items(VENTE_ITEMS[cat], amount_ht)
            # Mark older paid ventes as exported
            is_exported = (status == "paid") and month_offset >= 2 and random.random() > 0.2

            ventes.append(_invoice(
                invoice_number=f"FAC-{year}-{vente_counter:03d}",
                direction="outgoing",
                vendor_name=COMPANY_NAME, vendor_ice=COMPANY_ICE,
                client_name=c_name, client_ice=c_ice,
                items=items, tva=tva_pct, status=status,
                invoice_date=inv_date, due_date=due_date,
                category=cat, company_id=COMPANY_ID, is_exported=is_exported,
            ))

    # Update next_invoice_number to avoid conflicts
    db["company_profile"].update_one(
        {"_id": company_result.inserted_id},
        {"$set": {"next_invoice_number": vente_counter + 1}},
    )

    db["invoices"].insert_many(ventes)
    print(f"[OK] {len(ventes)} ventes inserted.")

    # ── Generate Achats (incoming) via recurring supplier loop ────────────────
    achats = []
    achat_counters = {}

    now_dt = _now()

    for sup_idx, cat, base_ht, tva_pct, due_days, freq_months in ACHAT_PROFILES:
        s_name, s_ice, *_ = SUPPLIERS[sup_idx]
        prefix = SUPPLIER_PREFIXES[sup_idx]

        # Generate one invoice per occurrence within MONTHS_BACK
        occurrence = 0
        month_offset = MONTHS_BACK - 1
        while month_offset >= 0:
            # Only generate at the right frequency
            if month_offset % freq_months != 0:
                month_offset -= 1
                continue

            days_ago_approx = month_offset * 30 + 15
            month_dt = _month_start(days_ago_approx)
            inv_date = _rand_day_in_month(month_dt)
            amount_ht = _jitter(base_ht, pct=0.15)

            # Status logic
            is_current_month = (month_offset == 0)
            is_recent = (month_offset <= 1)
            if is_current_month:
                status = random.choices(["extracted", "validated"], weights=[3, 2])[0]
                # extracted invoices have no due date yet; validated ones do
                due_date = inv_date + timedelta(days=due_days) if status == "validated" else None
            elif is_recent:
                status = random.choices(["validated", "paid"], weights=[3, 7])[0]
                due_date = inv_date + timedelta(days=due_days)
            else:
                # Older: mostly paid, a few validated (overdue) for alerts
                if month_offset <= 3:
                    status = random.choices(["paid", "validated"], weights=[85, 15])[0]
                else:
                    status = "paid"
                due_date = inv_date + timedelta(days=due_days)

            achat_counters[sup_idx] = achat_counters.get(sup_idx, 0) + 1
            inv_num = f"{prefix}-{year}-{achat_counters[sup_idx]:04d}"
            items = _make_items(ACHAT_ITEMS[sup_idx], amount_ht)
            is_exported = (status == "paid") and month_offset >= 2 and random.random() > 0.25

            achats.append(_invoice(
                invoice_number=inv_num,
                direction="incoming",
                vendor_name=s_name, vendor_ice=s_ice,
                client_name=COMPANY_NAME, client_ice=COMPANY_ICE,
                items=items, tva=tva_pct, status=status,
                invoice_date=inv_date, due_date=due_date,
                category=cat, company_id=COMPANY_ID, is_exported=is_exported,
            ))

            occurrence += 1
            month_offset -= 1

    db["invoices"].insert_many(achats)
    print(f"[OK] {len(achats)} achats inserted.")
    print(f"\n[OK] Total: {len(ventes) + len(achats)} invoices ({len(ventes)} ventes, {len(achats)} achats).")


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
        print(f"\nDone. Log in as firm admin: {FIRM_ADMIN_EMAIL} / {FIRM_ADMIN_PASSWORD}")
    else:
        print("\nDone. Database is empty and ready for a fresh demo.")


if __name__ == "__main__":
    main()
