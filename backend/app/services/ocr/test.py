from app.services.ocr.factory import get_invoice_parser

aws_parser = get_invoice_parser("aws_textract")
google_parser = get_invoice_parser("google_cloud_documentai")
azure_parser = get_invoice_parser("azure_document_intelligence")

file_path = "../../../documents/sample-invoice.pdf"
# print("-------------AWS------------------")
# print(aws_parser.extract_fields(file_path))
# print("-------------GCP------------------")
# print(google_parser.extract_fields(file_path))
print("-------------Azure------------------")
print(azure_parser.extract_fields(file_path))
print("-------------End------------------")

