# Invoice Processing API - MongoDB Setup with PyMongo

This project demonstrates how to set up a MongoDB schema for invoice processing using PyMongo and Pydantic for data validation with FastAPI.

## MongoDB Schema Overview

The invoice schema includes:

```json
{
  "_id": ObjectId("..."),
  "created_at": ISODate("2024-01-15T10:30:00Z"),
  "invoice_number": "INV-2024-001",
  "invoice_date": ISODate("2024-01-15T00:00:00Z"),
  "vendor_name": "Acme Corporation",
  "total_amount": 1080.00,
  "currency": "MAD",
  "items": [
    {
      "description": "Web Development Services",
      "quantity": 40,
      "unit_price": 25.00,
      "total": 1000.00
    }
  ],
  "category": "Professional Services",
  "tags": ["development", "monthly-service"],
  "source_type": "pdf",
  "status": "processed"
}
```

## Project Structure

```
backend/
├── app/
│   ├── models/
│   │   ├── __init__.py
│   │   └── invoice.py          # Pydantic models for data validation
│   ├── crud/
│   │   ├── __init__.py
│   │   └── invoice.py          # CRUD operations using PyMongo
│   ├── routes/
│   │   ├── health.py           # Health check endpoint
│   │   └── invoices.py         # Invoice API routes
│   ├── database.py             # Database configuration and connection
│   └── main.py                 # FastAPI application
├── example_usage.py            # Example usage script
├── requirements.txt            # Dependencies
└── README.md                   # This file
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (create `.env` file):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=invoice_processing
```

3. Make sure MongoDB is running on your system.

## Key Components

### 1. Pydantic Models (`app/models/invoice.py`)

- **Invoice**: Main model with all fields and validation
- **InvoiceItem**: Embedded model for invoice line items
- **InvoiceCreate**: Schema for creating new invoices (without ID)
- **InvoiceUpdate**: Schema for updating invoices (all fields optional)
- **InvoiceResponse**: Response schema for API endpoints

### 2. Database Configuration (`app/database.py`)

- Uses PyMongo `MongoClient` for synchronous operations
- Automatic index creation for performance optimization
- Connection management functions

### 3. CRUD Operations (`app/crud/invoice.py`)

Comprehensive CRUD operations including:
- Create, read, update, delete invoices
- Search by various fields (vendor, tags, date range)
- Aggregation queries for statistics
- Full-text search capabilities

### 4. API Routes (`app/routes/invoices.py`)

RESTful API endpoints:
- `POST /invoices/` - Create invoice
- `GET /invoices/` - List invoices with filtering
- `GET /invoices/{id}` - Get specific invoice
- `PUT /invoices/{id}` - Update invoice
- `DELETE /invoices/{id}` - Delete invoice
- And many more...

## Usage Examples

### 1. Running the API

```bash
cd backend
python -m uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Creating an Invoice via API

```python
import requests

invoice_data = {
    "invoice_number": "INV-2024-001",
    "invoice_date": "2024-01-15T00:00:00Z",
    "vendor_name": "Acme Corporation",
    "total_amount": 1080.00,
    "currency": "MAD",
    "items": [
        {
            "description": "Web Development Services",
            "quantity": 40,
            "unit_price": 25.00,
            "total": 1000.00
        }
    ],
    "category": "Professional Services",
    "tags": ["development", "monthly-service"],
    "source_type": "pdf",
    "status": "processed"
}

response = requests.post("http://localhost:8000/api/invoices/", json=invoice_data)
print(response.json())
```

### 3. Using CRUD Operations Directly

```python
from app.models.invoice import InvoiceCreate, InvoiceItem
from app.crud.invoice import InvoiceCRUD
from app.database import init_database

# Initialize database
init_database()

# Create invoice
invoice_data = InvoiceCreate(
    invoice_number="INV-2024-002",
    # ... other fields
)

invoice = InvoiceCRUD.create_invoice(invoice_data)
print(f"Created: {invoice}")

# Get invoice
retrieved = InvoiceCRUD.get_invoice_by_id(str(invoice.id))
print(f"Retrieved: {retrieved}")
```

### 4. Running the Example Script

```bash
cd backend
python example_usage.py
```

## Database Indexes

The following indexes are automatically created for optimal performance:

- `invoice_number` (unique)
- `vendor_name`
- `invoice_date`
- `status`
- `category`
- `created_at`
- `tags`

## Key Features

### 1. Data Validation
- Pydantic models ensure data integrity
- Custom ObjectId handling for MongoDB
- Decimal support for precise financial calculations

### 2. Error Handling
- Comprehensive error handling in CRUD operations
- Meaningful error messages for API consumers
- Duplicate key detection

### 3. Search Capabilities
- Filter by status, vendor, category
- Date range queries
- Tag-based search
- Full-text search across multiple fields

### 4. Aggregation Queries
- Summary statistics (total amount, averages, etc.)
- Vendor-specific totals
- Status-based counts

### 5. Performance Optimization
- Strategic indexing for common queries
- Pagination support
- Efficient aggregation pipelines

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `invoice_processing` | Database name |

````editorconfig
MONGO_URL=mongodb://localhost:27017
DB_NAME=invoice_processing
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PROJECT_LOCATION=us
GOOGLE_CLOUD_PROCESSOR_ID=your-processor-id
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your-api-endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=you-api-key
AWS_PROFILE_NAME=aws-profile-name
AWS_REGION_NAME=us-east-1
JWT_SECRET=secret  # genearte it with : python -c "import secrets; print(secrets.token_hex(32))"
ADMIN_FULL_NAME=admin_full_name
ADMIN_EMAIL=admin_email
ADMIN_PASSWORD=admin_password
````

## API Documentation

Once the server is running, visit `http://localhost:8000/docs` for interactive API documentation powered by Swagger UI.

## Best Practices Implemented

1. **Separation of Concerns**: Models, CRUD, and routes are separated
2. **Data Validation**: Pydantic models ensure data integrity
3. **Error Handling**: Comprehensive error handling throughout
4. **Performance**: Strategic indexing and efficient queries
5. **Documentation**: Well-documented code and API endpoints
6. **Type Safety**: Full type hints for better development experience

This setup provides a robust foundation for invoice processing with MongoDB using PyMongo and modern Python best practices.
