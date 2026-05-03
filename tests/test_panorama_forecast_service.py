import unittest

from panorama_forecast_service import run_panorama_forecast


class PanoramaForecastServiceTest(unittest.TestCase):
    def test_runs_real_omega_forecast_without_physics_baseline(self):
        result = run_panorama_forecast(
            job_id="test-job",
            request={
                "datasetId": "pendulum-200fps",
                "modelId": "panorama-v1",
                "targetVariable": "omega",
                "trainRatio": 0.75,
                "horizonSeconds": 1,
                "sampleRateFps": 200,
                "baselineEnabled": False,
            },
        )

        self.assertEqual(result["jobId"], "test-job")
        self.assertEqual(result["targetVariable"], "omega")
        self.assertEqual(result["source"], "panorama_realtime_backend")
        self.assertEqual(result["generatedFrom"]["rawPoints"], 200)
        self.assertTrue(result["series"])
        self.assertTrue(all(point["physics"] is None for point in result["series"]))
        self.assertIn("rad/s", result["metrics"][0]["value"])
        self.assertEqual(result["metrics"][1]["label"], "基线对照")


if __name__ == "__main__":
    unittest.main()
