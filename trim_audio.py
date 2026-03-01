import os
import subprocess
import sys

def trim_audio(input_file, start_time, end_time, output_file, fade_ms=2000):
    """
    Trims an audio file using ffmpeg directly (no external python dependencies needed).
    start_time and end_time should be in format HH:MM:SS or just seconds.
    """
    if not os.path.exists(input_file):
        print(f"❌ Error: Could not find input file: {input_file}")
        return False
        
    print(f"✂️ Trimming {os.path.basename(input_file)} from {start_time} to {end_time}...")
    
    # Calculate duration for the fade out if needed
    try:
        # Convert fade from ms to seconds
        fade_sec = fade_ms / 1000.0
        
        # Build the ffmpeg command
        # -y: overwrite output
        # -i: input file
        # -ss: start time (fast seek)
        # -to: end time
        # -af: audio filter (afade)
        cmd = [
            "ffmpeg", "-y", "-v", "error",
            "-ss", str(start_time),
            "-to", str(end_time),
            "-i", input_file,
            "-af", f"afade=t=in:ss=0:d=0.5,afade=t=out:st={float(end_time) - float(start_time) - fade_sec}:d={fade_sec}",
            output_file
        ]
        
        # Run ffmpeg
        subprocess.run(cmd, check=True)
        print(f"✅ Success! Saved trimmed loop to {output_file}")
        return True
        
    except FileNotFoundError:
        print("❌ Error: ffmpeg is not installed or not in PATH. Please install ffmpeg.")
        return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running ffmpeg: {e}")
        return False
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        return False

if __name__ == "__main__":
    print("\n--- KEANO ARENA MUSIC TRIMMER ---")
    print("Example usage in terminal:")
    print("python3 trim_audio.py '/path/to/Suno_Song.mp3' 00:00:15 00:01:45 '/path/to/Output.mp3'")
    print("-" * 33)
    
    if len(sys.argv) < 5:
        print("Usage: python3 trim_audio.py <input_file> <start_time> <end_time> <output_file>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    start_t = sys.argv[2]
    end_t = sys.argv[3]
    output_path = sys.argv[4]
    
    trim_audio(input_path, start_t, end_t, output_path)
