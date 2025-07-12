import asyncio
import datetime
import random

from faker import Faker

from app.database import get_invoices_collection

fake = Faker()

collection = get_invoices_collection()

CURRENCIES = ["USD", "EUR", "MAD"]
CATEGORIES = ["Professional Services", "Software", "Consulting", "Hardware"]
SOURCE_TYPES = ["pdf", "image", "email"]
STATUS = ["pending", "paid", "processed"]
ITEM_NAMES = [
    "Consultation Fee",
    "Software Subscription",
    "Development Services",
    "Cloud Hosting",
    "Maintenance & Support",
    "Project Management",
    "UI/UX Design",
    "Technical Audit",
    "Hardware Installation",
    "License Renewal",
    "Bug Fixing",
    "Training Session",
    "Monthly Retainer",
    "Custom Report",
    "Code Review",
    "System Integration",
    "Data Migration",
    "Mobile App Setup",
    "Server Monitoring",
    "Security Assessment"
]
def generate_invoice() -> dict:
    num_items = random.randint(1, 5)
    items = []
    total = 0.0

    for _ in range(num_items):
        quantity = random.randint(1, 10)
        unit_price = round(random.uniform(20, 500), 2)
        total_price = round(quantity * unit_price, 2)
        total += total_price

        items.append({
            "name": random.choice(ITEM_NAMES),
            "description": fake.text(max_nb_chars=50),
            "unit_price": unit_price,  # now float
            "quantity": quantity,
            "total": total_price       # now float
        })

    now = datetime.datetime.now(datetime.UTC)

    invoice = {
        "invoice_number": f"INV-{fake.unique.random_int(1000, 9999)}",
        "invoice_date": now - datetime.timedelta(days=random.randint(0, 60)),
        "vendor_name": fake.company(),
        "items": items,
        "total_amount": round(total, 2),  # float
        "currency": random.choice(CURRENCIES),
        "category": random.choice(CATEGORIES),
        "tags": [fake.word(), fake.word()],
        "source_type": random.choice(SOURCE_TYPES),
        "created_at": now,
        "status": random.choice(STATUS),
    }

    return invoice
async def seed_invoices(n: int = 100):
    collection.delete_many({})
    invoices = [generate_invoice() for _ in range(n)]
    result = collection.insert_many(invoices)
    print(f"Inserted {len(result.inserted_ids)} invoices.")
if __name__ == "__main__":
    asyncio.run(seed_invoices(100))
