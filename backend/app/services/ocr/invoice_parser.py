from abc import ABC, abstractmethod

class InvoiceParser(ABC):
    @abstractmethod
    def extract_fields(self, file_path: str | None, *, file_bytes_source: bytes = None) -> dict:
        """
        Extract fields from an invoice image or PDF.
        Returns a normalized dictionary.
        """
        pass