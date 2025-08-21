import os
from dotenv import load_dotenv

from app.services.ocr.invoice_parser import InvoiceParser
from app.services.ocr.aws_textract_service import AWSTextractInvoiceParser
from app.services.ocr.google_cloud_documentai_service import GoogleCloudDocumentAIInvoiceParser
from app.services.ocr.azure_document_intellignece_service import AzureDocumentIntelligenceInvoiceParser

load_dotenv()



def get_invoice_parser(service: str) -> InvoiceParser:
    """
    Factory function to get the appropriate invoice parser based on the service.

    Args:
        service (str): The name of the OCR service to use (e.g., 'aws_textract').

    Returns:
        InvoiceParser: An instance of the appropriate invoice parser.
    """
    if service == 'aws_textract':
        profile_name = os.getenv('AWS_PROFILE_NAME')
        region_name = os.getenv('AWS_REGION_NAME')
        return AWSTextractInvoiceParser(profile_name, region_name)

    elif service == 'google_cloud_documentai':
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
        location = os.getenv("GOOGLE_CLOUD_PROJECT_LOCATION")
        processor_id = os.getenv("GOOGLE_CLOUD_PROCESSOR_ID")
        return GoogleCloudDocumentAIInvoiceParser(project_id, location, processor_id)

    elif service == 'azure_document_intelligence':
        endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
        key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")
        invoice_parser = AzureDocumentIntelligenceInvoiceParser(endpoint, key)
        return invoice_parser

    else:
        raise ValueError(f"Unsupported OCR service: {service}")