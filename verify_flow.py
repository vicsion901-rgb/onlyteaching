import requests
import sys

BASE_URL = "http://localhost:8000"

def test_flow():
    # 1. Register
    email = "teacher@test.com"
    password = "password123"
    user_data = {
        "email": email,
        "password": password,
        "name": "Test Teacher",
        "role": "teacher",
        "school_id": 1
    }
    
    print("1. Registering user...")
    try:
        res = requests.post(f"{BASE_URL}/users/", json=user_data)
        if res.status_code == 200:
            print("   Success:", res.json())
        elif res.status_code == 400 and "already registered" in res.text:
            print("   User already registered, proceeding...")
        else:
            print("   Failed:", res.text)
            sys.exit(1)
    except Exception as e:
        print(f"   Error: {e}")
        sys.exit(1)

    # 2. Login
    print("\n2. Logging in...")
    login_data = {
        "username": email,
        "password": password
    }
    res = requests.post(f"{BASE_URL}/users/token", data=login_data)
    if res.status_code != 200:
        print("   Login Failed:", res.text)
        sys.exit(1)
    
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   Success. Token received.")

    # 3. Create Schedule
    print("\n3. Creating Schedule...")
    schedule_data = {
        "title": "Math Exam",
        "start_date": "2023-12-01T09:00:00",
        "end_date": "2023-12-01T11:00:00"
    }
    res = requests.post(f"{BASE_URL}/schedules/", json=schedule_data, headers=headers)
    if res.status_code != 200:
        print("   Schedule Creation Failed:", res.text)
        sys.exit(1)
    print("   Success:", res.json())

    # 4. Create Prompt
    print("\n4. Creating Prompt...")
    prompt_data = {
        "content": "Write a letter to parents about the math exam."
    }
    res = requests.post(f"{BASE_URL}/prompts/", json=prompt_data, headers=headers)
    if res.status_code != 200:
        print("   Prompt Creation Failed:", res.text)
        sys.exit(1)
    print("   Success:", res.json())
    print("   Generated Document:", res.json().get("generated_document"))

    print("\nAll tests passed!")

if __name__ == "__main__":
    test_flow()
