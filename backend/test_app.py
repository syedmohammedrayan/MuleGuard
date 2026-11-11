import os
import requests
import json
import time

url = "http://127.0.0.1:8001/analyze"

# Locate test CSV file
test_files = [
    os.path.join(os.path.dirname(__file__), "..", "fraud_test.csv"),
    os.path.join(os.path.dirname(__file__), "..", "money-mulling.csv"),
    "fraud_test.csv",
    "money-mulling.csv"
]

csv_path = next((f for f in test_files if os.path.exists(f)), None)
if not csv_path:
    raise FileNotFoundError("No test CSV file found (expected fraud_test.csv or money-mulling.csv)")

files = {'file': open(csv_path, 'rb')}

try:
    print(f"Sending request to {url} using {os.path.basename(csv_path)}...")
    start = time.time()
    response = requests.post(url, files=files)
    end = time.time()
    
    print(f"Status Code: {response.status_code}")
    print(f"Time Taken: {end - start:.4f}s")
    
    if response.status_code == 200:
        data = response.json()
        print("\n--- JSON Response Summary ---")
        print(json.dumps(data.get('summary', {}), indent=2))
        
        # assertions
        assert data['summary']['suspicious_accounts_flagged'] > 0
        assert data['summary']['fraud_rings_detected'] > 0
        print("\n✅ Verification Successful: Suspicious accounts and rings detected.")
    else:
        print("\n❌ Request Failed")
        print(response.text)

except Exception as e:
    print(f"\n❌ Error: {e}")
finally:
    files['file'].close()
