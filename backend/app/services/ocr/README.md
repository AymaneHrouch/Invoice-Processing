# Invoice OCR Service Comparison and Setup Guide

## Overview

This project integrates three major cloud OCR services for **invoice parsing**, each using their **pretrained invoice processor**:

| Service | Pretrained Invoice Model Capabilities |
|---------|----------------------------------------|
| **Google Cloud Document AI – Invoice Parser** | Detects invoice structure, normalizes fields (dates, amounts), and labels data semantically. Strong multilingual and form-handling capabilities. |
| **Azure Document Intelligence – Invoice Model** | Prebuilt model extracts key invoice fields without training. Returns confidence scores for each extracted value. |
| **AWS Textract – AnalyzeExpense** | Tailored for receipts and invoices, identifies fields and line items in tabular form. Handles complex layouts and supports key-value pairing. |

Using the pretrained models ensures you get:
- **Structured field extraction** (vendor name, invoice number, totals, etc.)
- **Line-item detection**
- **Confidence scores** for each field
- **Support for multiple languages and formats**

---

## Setup Instructions

### 1. Google Cloud Document AI
1. **Enable Document AI API** in the [Google Cloud Console](https://console.cloud.google.com/).
2. **Create a Processor**:
   - Go to **Document AI Processors**.
   - Create an **Invoice Parser** processor.
   - Note the **Processor ID**, **Project ID**, and **Location**.
3. **Create a Service Account & Download Key**:
   - Go to **IAM & Admin → Service Accounts**.
   - Create a service account and download its JSON key file.
4. **Set Environment Variables**:
   - Path to service account key
   - Project ID
   - Processor location
   - Processor ID

---

### 2. Azure Document Intelligence
1. **Create a Document Intelligence Resource** in the [Azure Portal](https://portal.azure.com/).
2. **Get Endpoint and Key** from the resource's **Keys and Endpoint** section.
3. **Set Environment Variables**:
   - API Endpoint
   - API Key

---

### 3. AWS Textract
1. **Install and Configure AWS CLI**:
   - Run `aws configure --profile your_profile_name`
   - Provide Access Key, Secret Key, and Region.
2. **Ensure IAM Permissions**:
   - Attach the `AmazonTextractFullAccess` policy to your IAM user.
3. **Set Environment Variables**:
   - AWS CLI profile name
   - AWS region

---

## Architecture Overview

### Abstract Class: `InvoiceParser`
- Defines a **standard interface** for extracting invoice fields.
- Ensures all implementations (AWS, Google, Azure) have the same method signature and return a **normalized dictionary**.
- Makes it easy to **switch providers** or **add new ones** without changing business logic.

### Factory Method: `get_invoice_parser`
- Takes the service name (e.g., `"aws_textract"`, `"google_cloud_documentai"`, `"azure_document_intelligence"`) and returns the correct parser instance.
- Uses environment variables for credentials and configuration.
- Centralizes creation logic so the rest of the app doesn’t need to know about service-specific details.

**Benefits**:
- **Service Agnostic**: The main application code only depends on the abstract class.
- **Extensibility**: Adding a new OCR provider only requires:
  1. Creating a new implementation of `InvoiceParser`.
  2. Adding a case to the factory method.
- **Maintainability**: All initialization logic for each service is in one place.


