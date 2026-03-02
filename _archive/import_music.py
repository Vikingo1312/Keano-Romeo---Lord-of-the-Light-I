import os
import shutil
import subprocess

SOURCE_DIR = os.path.expanduser("~/Desktop/LORD OF THE LIGHT I/SOUNDTRACK x ARENA THEME SONGS")
DEST_DIR = os.path.expanduser("~/.gemini/antigravity/scratch/keano_gta/assets/audio/music")

MAP = {
    "1_JAPAN.mp3": "1_Japan.mp3",
    "2_INDIA.mp3": "2_India.mp3",
    "3_BRAZIL (Pablos Favela).mp3": "3_Brazil.mp3",
    "4_CHINA.mp3": "4_China.mp3",
    "5_ITALIA.mp3": "5_Italy.mp3",
    "6_GERMANY.mp3": "6_Germany.mp3",
    "7_JAMAICA.wav": "7_Jamaica.wav",  
    "8_POLAND .mp3": "8_Poland.mp3",
    "9_MEXICO .mp3": "9_Mexico.mp3",
    "10_SPAIN .mp3": "10_Spain.mp3",
    "11_JJ (Vikingos Throne)2.mp3": "11_Japan_Night.mp3",
    "12_DOJO_DARK.mp3": "12_Dojo_Dark.mp3",
    "13_RUSSIA.wav": "13_Russia_Ice.wav",
    "14_VALHALLA _BOSS.wav": "14_Valhalla_Boss.wav",
    "MAIN SOUNDTRACK.mp3": "main_menu.mp3"
}

def convert_or_copy():
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
        
    for src_file, dest_file in MAP.items():
        src_path = os.path.join(SOURCE_DIR, src_file)
        dest_path = os.path.join(DEST_DIR, dest_file)
        
        if not os.path.exists(src_path):
            print(f"❌ Missing source: {src_file}")
            continue
            
        print(f"Processing {src_file} -> {dest_file}...")
        
        try:
            shutil.copy2(src_path, dest_path)
            print(f"✅ Copied: {dest_file}")
        except Exception as e:
            print(f"❌ Failed to copy {src_file}: {e}")

if __name__ == "__main__":
    convert_or_copy()
    print("Done mapping soundtracks!")
