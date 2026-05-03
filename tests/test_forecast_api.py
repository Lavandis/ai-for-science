import time
import unittest

from fastapi.testclient import TestClient

from main import app


class ForecastApiTest(unittest.TestCase):
    def test_creates_forecast_job_and_returns_realtime_result(self):
        client = TestClient(app)

        response = client.post(
            "/api/forecast/jobs",
            json={
                "datasetId": "pendulum-200fps",
                "modelId": "panorama-v1",
                "targetVariable": "theta",
                "trainRatio": 0.75,
                "horizonSeconds": 1,
                "sampleRateFps": 200,
                "baselineEnabled": True,
            },
        )

        self.assertEqual(response.status_code, 200)
        job = response.json()
        self.assertEqual(job["status"], "queued")

        for _ in range(30):
            job = client.get(f"/api/forecast/jobs/{job['id']}").json()
            if job["status"] == "completed":
                break
            time.sleep(0.2)

        self.assertEqual(job["status"], "completed")

        result_response = client.get(f"/api/forecast/jobs/{job['id']}/result")
        self.assertEqual(result_response.status_code, 200)
        result = result_response.json()
        self.assertEqual(result["jobId"], job["id"])
        self.assertEqual(result["source"], "panorama_realtime_backend")
        self.assertTrue(result["series"])


if __name__ == "__main__":
    unittest.main()
