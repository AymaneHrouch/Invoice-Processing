"""
Example usage of the Invoice MongoDB schema with PyMongo
"""
from datetime import datetime
from decimal import Decimal

from app.models.invoice import InvoiceCreate, InvoiceItem
from app.crud.invoice import InvoiceCRUD
from app.database import init_database


def main():
    """Example of how to use the Invoice schema"""
    
    # Initialize database
    print("Initializing database...")
    init_database()
    
    # Create sample invoice items
    items = [
        InvoiceItem(
            description="Web Development Services",
            quantity=40,
            unit_price=Decimal("25.00"),
            total=Decimal("1000.00")
        ),
        InvoiceItem(
            description="Hosting Setup",
            quantity=1,
            unit_price=Decimal("80.00"),
            total=Decimal("80.00")
        )
    ]
    
    # Create sample invoice
    invoice_data = InvoiceCreate(
        invoice_number="INV-2024-001",
        invoice_date=datetime(2024, 1, 15),
        vendor_name="Acme Corporation",
        total_amount=Decimal("1080.00"),
        currency="MAD",
        items=items,
        category="Professional Services",
        tags=["development", "monthly-service"],
        source_type="pdf",
        status="processed"
    )
    
    print("\n=== Creating Invoice ===")
    try:
        # Create the invoice
        created_invoice = InvoiceCRUD.create_invoice(invoice_data)
        print(f"Created invoice: {created_invoice}")
        invoice_id = str(created_invoice.id)
        
        print("\n=== Retrieving Invoice ===")
        # Get the invoice by ID
        retrieved_invoice = InvoiceCRUD.get_invoice_by_id(invoice_id)
        print(f"Retrieved invoice: {retrieved_invoice}")
        
        print("\n=== Getting All Invoices ===")
        # Get all invoices
        all_invoices = InvoiceCRUD.get_all_invoices()
        print(f"Total invoices: {len(all_invoices)}")
        
        print("\n=== Searching by Vendor ===")
        # Search by vendor
        vendor_invoices = InvoiceCRUD.get_invoices_by_vendor("Acme Corporation")
        print(f"Invoices from Acme Corporation: {len(vendor_invoices)}")
        
        print("\n=== Getting Summary ===")
        # Get summary statistics
        summary = InvoiceCRUD.get_invoices_summary()
        print(f"Summary: {summary}")
        
        print("\n=== Updating Invoice Status ===")
        # Update invoice status
        updated_invoice = InvoiceCRUD.update_invoice_status(invoice_id, "paid")
        print(f"Updated status: {updated_invoice.status}")
        
        print("\n=== Searching by Tags ===")
        # Search by tags
        tagged_invoices = InvoiceCRUD.get_invoices_by_tags(["development"])
        print(f"Invoices with 'development' tag: {len(tagged_invoices)}")
        
        print("\n=== Full Text Search ===")
        # Full text search
        search_results = InvoiceCRUD.search_invoices("Web Development")
        print(f"Search results for 'Web Development': {len(search_results)}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
