import logging
from pathlib import Path
import sys
import time

LOG_DIR = Path("logs")
LOG_FILE = LOG_DIR / "invoice_processing.log"

LOG_FORMAT = "%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    """Configure root logger to write to both console and a rotating log file."""
    LOG_DIR.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    if root.handlers:
        return

    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(console)

    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    for name in ("pymongo", "urllib3", "watchfiles", "python_multipart"):
        logging.getLogger(name).setLevel(logging.WARNING)

    separator = (
        "\n\n"
        + "=" * 70 + "\n"
        + "  NEW APP INSTANCE — " + time.strftime("%Y-%m-%d %H:%M:%S") + "\n"
        + "=" * 70
    )
    file_handler.stream.write(separator + "\n")
    file_handler.stream.flush()
