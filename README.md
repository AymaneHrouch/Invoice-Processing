# Invoice Processing Project Documentation

## Overview

This project is a comprehensive invoice processing application that allows users to manage, store, and analyze invoices. The application is divided into two main parts: a FastAPI backend with MongoDB and a React frontend with Vite.

## Project Architecture

### Project Structure

```
├── backend/           # FastAPI API with MongoDB
│   ├── app/           # Main source code
│   │   ├── core/      # Core functionalities
│   │   ├── crud/      # CRUD operations
│   │   ├── models/    # Pydantic data models
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business services
│   │   └── utils/     # Utilities
└── frontend/          # React application with Vite
    ├── public/        # Static resources
    └── src/           # React source code
        ├── components/ # React components
        ├── hooks/     # Custom hooks
        ├── pages/     # Application pages
        └── utils/     # Utilities
```

## Backend (FastAPI + MongoDB)

### Technologies Used

- **FastAPI** (v0.115.12): Modern, high-performance API framework
- **PyMongo** (v4.0.0+): MongoDB driver for Python
- **Pydantic** (v2.0.0+): Data validation and serialization
- **Uvicorn** (v0.34.3): ASGI server for FastAPI
- **Python-dotenv**: Environment variable management

### Data Model

The main invoice schema in MongoDB:

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

### API Endpoints

The API exposes several RESTful endpoints:

- `POST /invoices/` - Create an invoice
- `GET /invoices/` - List invoices with filtering
- `GET /invoices/{id}` - Get a specific invoice
- `PUT /invoices/{id}` - Update an invoice
- `DELETE /invoices/{id}` - Delete an invoice
- `POST /upload/single` - Upload and process a single invoice file
- `POST /upload/batch` - Upload and process a batch of invoice files
- `POST /upload/single` - Upload and process multiple invoice files
- `GET /stats` - Get statistics on uploaded invoices

### Database Configuration

MongoDB connection is configured via environment variables:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=invoice_processing
```

## Frontend (React + Vite)

### Technologies Used

- **React** (v19.1.0): UI library
- **Vite** (v7.0.0): Fast build tool
- **Tailwind CSS** (v4.1.11): Utility-first CSS framework
- **Shadcn UI**: Accessible UI components
- **Axios** (v1.10.0): HTTP client
- **Recharts** (v3.1.0): Charting library

### Main Features

1. **Dashboard**: Visualization of statistics and trends
2. **Invoice Management**: List, add, edit, and delete invoices
3. **Automated Processing**: Data extraction from files

### Invoice Processing with AI

The application supports two methods for adding invoices:

1. **Manual Entry**: Form to enter invoice details
2. **AI Processing**: Upload files for automatic data extraction

#### Supported File Types

```javascript
export const SUPPORTED_FILE_TYPES = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.txt'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

## Deployment

### Prerequisites

- Python 3.13+
- Node.js (recent version)
- MongoDB

### Backend Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Configure environment variables (create a `.env` file)
4. Start the server:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

### Frontend Installation

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Integration of OCR and AI Services

This project uses both **paid services** and **open-source solutions** for Optical Character Recognition (OCR).

### Paid Services
We support integration with the following cloud-based OCR services:
- **AWS Textract**
- **Azure Document Intelligence**
- **Google Cloud Document AI**

For detailed setup instructions for these services, see the [OCR Services Setup Guide](./backend/app/services/ocr/README.md).
### Ollama (Local Model)

Ollama allows you to run AI models locally for data extraction and document processing.

#### Installing Ollama

1. Download and install Ollama from [https://ollama.ai/download](https://ollama.ai/download)
2. Open a terminal and run the following command to download a model (e.g., llama4):

```bash
ollama pull llama4
```

#### Project Configuration

Add the following environment variables to the backend `.env` file:

```env
OLLAMA_ENABLED=true
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama2
```

#### Usage

```python
import requests
import json

def extract_text_with_ollama(file_content, prompt):
    ollama_host = os.getenv('OLLAMA_HOST')
    ollama_model = os.getenv('OLLAMA_MODEL')
    
    # Prepare the prompt with the file content
    full_prompt = f"{prompt}\n\nDocument content:\n{file_content}"
    
    # Call the Ollama API
    response = requests.post(
        f"{ollama_host}/api/generate",
        json={
            "model": ollama_model,
            "prompt": full_prompt,
            "stream": False
        }
    )
    
    result = response.json()
    return result['response']
```

#### Running Ollama in Production

To run Ollama in production, you can use Docker:

```bash
docker run -d -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
```

## Implemented Best Practices

1. **Separation of Concerns**: Models, CRUD, and routes are separated
2. **Data Validation**: Pydantic models ensure data integrity
3. **Error Handling**: Comprehensive error management
4. **Performance**: Strategic indexing and efficient queries
5. **Documentation**: Well-documented code and API endpoints

## Conclusion

This project provides a solid foundation for invoice processing with MongoDB, FastAPI, and React, using modern development best practices. It is designed to be extensible and can be easily integrated with OCR services and AI models for automatic data extraction.
