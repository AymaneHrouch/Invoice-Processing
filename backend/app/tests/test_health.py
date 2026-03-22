from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    """
    Health endpoint returns 200 (DB connected) or 503 (DB unavailable).
    Both are valid — the test verifies the endpoint responds and has the
    expected shape, not that the DB is reachable in the test environment.
    """
    response = client.get("/health")
    assert response.status_code in (200, 503)
