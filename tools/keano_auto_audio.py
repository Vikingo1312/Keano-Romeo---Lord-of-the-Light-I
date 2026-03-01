import os
from elevenlabs.client import ElevenLabs
from elevenlabs import save
import time

# ==========================================
# 🎵 KEANO: VOLLAUTOMATISCHER AUDIO-GENERATOR
# ==========================================
# Installieren: pip install elevenlabs

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "FÜGE_HIER_DEINEN_KEY_EIN")
client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Ordnerstruktur
OUT_DIR = "assets/audio/voice"
ANN_DIR = "assets/audio/announcer"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ANN_DIR, exist_ok=True)

# ----------------------------------------------------
# 1. VOICE ID MAPPING (Die passenden Schauspieler-Stimmen)
# ----------------------------------------------------
# WICHTIG: Suche diese Voice IDs in ElevenLabs heraus und trag sie hier ein!
VOICES = {
    "announcer": "TxGEqnAI0114KC3D7m08", # Bsp: Clyde (Deep, Raspy)
    "keano":     "ErXwobaYiN019PkySvjV", # Bsp: Antoni (Heldenhaft)
    "vikingo":   "pNInz6obbfDQGcgMyIGb", # Bsp: Adam (Tiefster Bass, Boss)
    "gargamel":  "ThT5KcBeYPX3keUQqHPh", # Bsp: Dorothy -> Braucht später Vocoder-Effekt
    "jayden":    "VR6AewLTigWG4xA35SmY", # Bsp: Fin (Dunkel, Rival)
    "putin":     "SOYHLrjzK2X1ezoPC6cr", # Bsp: Callum (Tief, Kalt)
    "hattori":   "XB0fDUnXU5ywgI7N1iT2", # Bsp: Harry (Flüsternd, Ruhig)
    # Füge hier die IDs für die restlichen 9 Fighter ein!
}

# ----------------------------------------------------
# 2. DAS KOMPLETTE SKRIPT (Alle Fighter + Announcer)
# ----------------------------------------------------
SCRIPT_DATA = {
    # THE ANNOUNCER
    "announcer": {
        "round_1": "ROUND ONE!",
        "round_2": "ROUND TWO!",
        "round_final": "FINAL ROUND!",
        "fight": "FIGHT!",
        "ko": "K.O.!",
        "perfect": "PERFECT!",
        "win": "YOU WIN!",
        "lose": "YOU LOSE...",
        "game_over": "GAME OVER.",
        "continue": "CONTINUE?",
        "select": "SELECT YOUR FIGHTER!"
    },
    
    # 0. KEANO
    "keano": {
        "intro": "Machen wir's kurz. Ich hab ein Universum zu retten.",
        "taunt": "Dein Licht ist schwach!",
        "special": "LICHT-TRIGGER!",
        "super": "KOSMISCHE ENTLADUNG!",
        "hit": "Ugh!",
        "ko": "Nein...!",
        "win": "Das Licht fließt weiter.",
        "select": "Lichtgeschwindigkeit."
    },
    
    # 1. HATTORI
    "hattori": {
        "intro": "Kage wa waga ie...",
        "taunt": "Omae wa osoi.",
        "special": "RYUU NO IKARI!",
        "super": "KAGE BUNSHIN!",
        "hit": "Kuh!",
        "ko": "Masaka...",
        "win": "Hayasugita na.",
        "select": "Shinobi no chi."
    },

    # 14. VIKINGO (Der Endboss)
    "vikingo": {
        "intro": "Du wagst es, den IMPERATOR herauszufordern?!",
        "taunt": "Knie nieder, JUNGE!",
        "special": "URGEWALT!",
        "super": "RAGNARÖK BRICHT HEREIN!",
        "hit": "Grrrrrrh!",
        "ko": "Unmöglich... mein eigenes BLUT...!",
        "win": "Die Linie duldet keine Schwäche.",
        "select": "Valhalla wartet."
    }
    
    # -> Hier kannst du die restlichen Fighter aus unserer 'elevenlabs_batch_prompts.md' exakt so hinzufügen!
}

def generate_keano_audio():
    print("🔥 STARTE KEANO AUDIO-GENERATOR 🔥")
    print(f"Zielordner: {OUT_DIR} und {ANN_DIR}\n")
    
    total_files = sum(len(lines) for lines in SCRIPT_DATA.values())
    print(f"Generiere insgesamt {total_files} Audio-Dateien...")
    
    count = 1
    for character, lines in SCRIPT_DATA.items():
        voice_id = VOICES.get(character)
        
        if not voice_id:
            print(f"⚠️ Überspringe {character.upper()} (Keine Voice ID eingetragen)")
            continue
            
        print(f"\n🎙️ Generiere Stimmen für: {character.upper()}")
        
        # Bestimme den Zielordner (Announcer vs Fighter)
        target_dir = ANN_DIR if character == "announcer" else OUT_DIR
            
        for action_name, text in lines.items():
            filename = f"{character}_{action_name}.mp3" if character != "announcer" else f"ann_{action_name}.mp3"
            filepath = os.path.join(target_dir, filename)
            
            # Überspringen, falls Datei schon existiert (spart API-Credits!)
            if os.path.exists(filepath):
                print(f"  ⏭️ {filename} existiert bereits.")
                count += 1
                continue
                
            print(f"  [{count}/{total_files}] Generiere: {filename} -> '{text}'")
            
            try:
                # API Call an ElevenLabs
                audio_generator = client.generate(
                    text=text,
                    voice=voice_id,
                    model="eleven_multilingual_v2" # Bestes Modell für Emotion & Akzente!
                )
                
                # Datei lokal speichern
                save(audio_generator, filepath)
                print(f"  ✅ {filename} gespeichert!")
                
                time.sleep(1) # Schutz vorm API Rate-Limit 
                
            except Exception as e:
                print(f"  ❌ Fehler bei {filename}: {e}")
                
            count += 1
            
    print("\n🏁 ALLE AUDIO-DATEIEN WURDEN ERFOLGREICH GENERIERT UND BENANNT!")

if __name__ == "__main__":
    if ELEVENLABS_API_KEY == "FÜGE_HIER_DEINEN_KEY_EIN":
        print("❗ Bitte öffne das Skript und trage deinen ElevenLabs API-Key oben ein!")
    else:
        generate_keano_audio()
