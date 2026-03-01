import os
import time
import json
import urllib.request

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "sk_9b1f3d5911e33480f13537d43a677642276393e83d37f984")

VOICE_POOL = {
    "keano": "ErXwobaYiN019PkySvjV", "vikingo": "ErXwobaYiN019PkySvjV", "hattori": "ErXwobaYiN019PkySvjV",
    "alcapone": "ErXwobaYiN019PkySvjV", "paco": "ErXwobaYiN019PkySvjV", "marley": "ErXwobaYiN019PkySvjV",
    "tzubaza": "ErXwobaYiN019PkySvjV", "gargamel": "ErXwobaYiN019PkySvjV", "putin": "ErXwobaYiN019PkySvjV",
    "jayden": "ErXwobaYiN019PkySvjV", "juan": "ErXwobaYiN019PkySvjV", "lee": "ErXwobaYiN019PkySvjV",
    "raheel": "ErXwobaYiN019PkySvjV", "kowalski": "ErXwobaYiN019PkySvjV"
}
ACTIONS = {
    'intro': "Let's finish this.", 'win': "Too easy.", 'special': "Special attack!",
    'super': "I will destroy you!", 'taunt': "Come on!", 'hit': "Ugh!",
    'ko': "Nooo!", 'select': "I am ready."
}
INVALID_SIZE_THRESHOLD = 4000000
OUT_DIR = os.path.expanduser("/Users/vikingo40/.gemini/antigravity/scratch/keano_gta/assets/audio/voice")
    

def generate_tts(text, voice_id, dest_path):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": ELEVENLABS_API_KEY}
    data = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "use_speaker_boost": True}}
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            with open(dest_path, 'wb') as f:
                f.write(response.read())
            print(f"✅ Generated: {os.path.basename(dest_path)}")
            return True
    except Exception as e:
        print(f"❌ Error generating {os.path.basename(dest_path)}: {e}")
        return False

print(f"Checking {OUT_DIR} for missing or corrupted files...")
generated_count = 0
for char, voice_id in VOICE_POOL.items():
    for action, text in ACTIONS.items():
        filename = f"{char}_{action}.mp3"
        filepath = os.path.join(OUT_DIR, filename)
        needs_generation = not os.path.exists(filepath) or os.path.getsize(filepath) == 0 or os.path.getsize(filepath) > INVALID_SIZE_THRESHOLD
        if needs_generation:
            custom_text = text
            if action == 'special':
                if char == 'keano': custom_text = "Light flash!"
                elif char == 'vikingo': custom_text = "Obliterate!"
                elif char == 'hattori': custom_text = "Shadow strike!"
                elif char == 'alcapone': custom_text = "Eat lead!"
            elif action == 'taunt':
                if char == 'keano': custom_text = "You can't hide from the light."
                elif char == 'vikingo': custom_text = "Bow down."
            print(f"Missing {filename}. Generating: '{custom_text}'...")
            if generate_tts(custom_text, voice_id, filepath): generated_count += 1
            time.sleep(0.5)

print(f"\nFinished. Total regenerated: {generated_count}")
