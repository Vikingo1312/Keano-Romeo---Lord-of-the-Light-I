import os
import json
import time
from pydub import AudioSegment
from openai import OpenAI
from elevenlabs.client import ElevenLabs
from elevenlabs import save

# ==========================================
# 🚀 KEANO - VOLLAUTOMATISCHE AUDIO PIPELINE
# ==========================================
# Benötigt: pip install openai elevenlabs pydub
# System: ffmpeg muss installiert sein (für pydub)

# 1. API Keys (Hier deine Keys eintragen oder als Umgebungsvariable setzen)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "dein-openai-key-hier")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "dein-elevenlabs-key-hier")

# Clients initialisieren
llm_client = OpenAI(api_key=OPENAI_API_KEY)
tts_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# 2. Voice Mapping (Welcher Voice ID in ElevenLabs entspricht welcher Rolle?)
# Finde deine Voice IDs in ElevenLabs unter "Voices" -> ID kopieren
VOICE_MAPPING = {
    "Erzähler": "JBFqnCBcs6RMkjGVYIVR", # Bsp: Marcus (Deep)
    "Keano": "ErXwobaYiN019PkySvjV",    # Bsp: Antoni (Young/Hero)
    "Vikingo": "pNInz6obbfDQGcgMyIGb",  # Bsp: Adam (Deep/Boss)
    "Announcer": "TxGEqnAI0114KC3D7m08" # Bsp: Clyde (Raspy)
}
DEFAULT_VOICE = "JBFqnCBcs6RMkjGVYIVR" # Fallback

def step1_generate_script(prompt: str) -> list:
    """LLM erzeugt strukturierte JSON-Dialoge basierend auf dem Prompt"""
    print(f"🤖 [Schritt 1] LLM generiert Skript für Prompt: '{prompt[:50]}...'")
    
    system_prompt = """
    Du bist ein Audio-Director für ein 2D Arcade Game. 
    Basierend auf dem Prompt des Users, erstelle ein Dialog-Skript.
    Antworte AUSSCHLIESSLICH mit einem validen JSON-Array.
    Format: [{"role": "RollenName", "text": "Gesprochener Text"}, ...]
    Erlaubte Rollen: Erzähler, Keano, Vikingo, Announcer.
    """
    
    response = llm_client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"} # Erzwingt JSON
    )
    
    # Parsing (OpenAI liefert das JSON im content)
    try:
        content = response.choices[0].message.content
        # Wir erwarten {"script": [{"role": "...", "text": "..."}, ...]}
        # Falls das LLM nur ein Array zurückgibt, passen wir es an.
        if "{" in content:
            script_data = json.loads(content)
            return script_data.get("script", script_data.get("dialogs", []))
        return json.loads(content)
    except Exception as e:
        print(f"❌ Fehler beim JSON Parsing: {e}\nRaw={content}")
        return []

def step2_generate_tts(script: list, output_dir="temp_audio"):
    """ElevenLabs TTS für jede Zeile generieren"""
    print(f"🎙️ [Schritt 2] Generiere TTS für {len(script)} Zeilen...")
    os.makedirs(output_dir, exist_ok=True)
    
    generated_files = []
    
    for idx, line in enumerate(script):
        role = line.get("role", "Erzähler")
        text = line.get("text", "")
        
        voice_id = VOICE_MAPPING.get(role, DEFAULT_VOICE)
        file_path = os.path.join(output_dir, f"line_{idx:03d}_{role}.mp3")
        
        print(f"   -> Generiere Line {idx}: {role} spricht...")
        
        # TTS API Call
        audio_generator = tts_client.generate(
            text=text,
            voice=voice_id,
            model="eleven_multilingual_v2"
        )
        
        # Audio speichern
        save(audio_generator, file_path)
        generated_files.append(file_path)
        time.sleep(0.5) # Rate Limit Schutz
        
    return generated_files

def step3_merge_audio(file_paths: list, output_filename="final_master_mix.mp3", pause_ms=1000):
    """Zusammenfügen der MP3s mit Pydub"""
    print(f"🎧 [Schritt 3] Füge {len(file_paths)} Dateien zusammen...")
    
    master_audio = AudioSegment.empty()
    pause = AudioSegment.silent(duration=pause_ms)
    
    for file_path in file_paths:
        segment = AudioSegment.from_mp3(file_path)
        master_audio += segment + pause # Sprachclip + 1 Sekunde Pause
        
    master_audio.export(output_filename, format="mp3")
    print(f"✅ FERTIG! Master Mix gespeichert als: {output_filename}")

def run_automated_pipeline(prompt: str):
    """Die komplette vollautomatische Aufrufkette"""
    print("\n" + "="*50)
    print("🚀 STARTE VOLLAUTOMATISCHE AUDIO PIPELINE")
    print("="*50)
    
    # 1. Prompt -> JSON Skript
    script = step1_generate_script(prompt)
    if not script:
        print("Pipeline abgebrochen: Kein Skript generiert.")
        return
        
    # 2. JSON Script -> Einzelne MP3s
    audio_files = step2_generate_tts(script)
    
    # 3. Einzelne MP3s -> Finale Master MP3
    step3_merge_audio(audio_files, output_filename="assets/audio/story_intro_automix.mp3")

# ==========================================
# ANWENDUNGS-BEISPIEL
# ==========================================
if __name__ == "__main__":
    test_prompt = """
    Erstelle einen epischen Intro-Dialog zwischen dem Erzähler und Keano. 
    Der Erzähler warnt vor der nahenden Dunkelheit, Keano antwortet selbstbewusst, 
    dass sein Licht den Schatten brechen wird. Maximal 4 kurze Sätze.
    """
    
    # ACHTUNG: Nur ausführen, wenn API Keys oben gesetzt sind!
    # run_automated_pipeline(test_prompt)
    print("Pipeline-Skript ist bereit! Füge deine API-Keys (OpenAI & ElevenLabs) ein und starte es.")
