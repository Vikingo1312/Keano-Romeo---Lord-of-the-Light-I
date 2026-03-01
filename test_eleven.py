import os
import json
import urllib.request

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "sk_9fe52cba1a1bbba6cf0927da084ab75df1b4a03ee73afbf9")
url = "https://api.elevenlabs.io/v1/text-to-speech/ErXwobaYiN019PkySvjV"
headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": ELEVENLABS_API_KEY}
data = {"text": "Test", "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        print("Success!")
except urllib.error.HTTPError as e:
    error_message = e.read().decode('utf-8')
    print(f"Error {e.code}: {error_message}")
