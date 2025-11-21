import pytest
from httpx import AsyncClient, ASGITransport
from src.app import app, activities


@pytest.mark.asyncio
async def test_get_activities():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # Ensure a sample activity exists
    assert "Chess Club" in data


@pytest.mark.asyncio
async def test_signup_and_unregister_flow():
    test_activity = "Chess Club"
    test_email = "testuser@example.com"

    # Ensure test state is clean
    if test_email in activities[test_activity]["participants"]:
        activities[test_activity]["participants"].remove(test_email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Sign up
        r = await ac.post(f"/activities/{test_activity}/signup?email={test_email}")
        assert r.status_code == 200
        assert test_email in activities[test_activity]["participants"]

        # Duplicate signup should return 400
        r2 = await ac.post(f"/activities/{test_activity}/signup?email={test_email}")
        assert r2.status_code == 400

        # Unregister
        r3 = await ac.delete(f"/activities/{test_activity}/participants?email={test_email}")
        assert r3.status_code == 200
        assert test_email not in activities[test_activity]["participants"]

        # Unregistering non-existent should return 400
        r4 = await ac.delete(f"/activities/{test_activity}/participants?email={test_email}")
        assert r4.status_code == 400
