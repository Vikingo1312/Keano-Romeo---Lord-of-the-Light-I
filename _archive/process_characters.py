import os
os.environ["ORT_ENABLE_COREML"] = "0"
import sys
from rembg import remove
from PIL import Image

def process_image(input_path, output_dir):
    filename = os.path.basename(input_path)
    output_path = os.path.join(output_dir, filename)

    print(f"Processing: {filename}")
    
    try:
        # Load the original image
        with open(input_path, 'rb') as i:
            input_bytes = i.read()
        
        # Remove background via rembg, forcing CPU to bypass Mac CoreML errors
        print(f"Removing background (Human Segmentation Mode)...")
        from rembg import new_session
        session = new_session("u2net_human_seg", providers=['CPUExecutionProvider'])
        output_bytes = remove(input_bytes, session=session)
        
        # Load the result into PIL for cropping
        import io
        img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
        
        print(f"Cropping...")
        # Get the bounding box of non-transparent pixels
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
        
        # Save to the output directory
        img.save(output_path, 'PNG')
        print(f"Saved to: {output_path}")

    except Exception as e:
        print(f"Error processing {filename}: {e}")

def main():
    input_dir = os.path.expanduser("~/Desktop/Keano_3D_Characters")
    base_out_dir = os.path.abspath("./Finished_Characters")
    clean_out_dir = os.path.join(base_out_dir, "Clean_Gameplay")
    
    # Create output directories if they don't exist
    os.makedirs(clean_out_dir, exist_ok=True)
    
    # Find all PNGs in the input dir
    if not os.path.exists(input_dir):
        print(f"Input directory not found: {input_dir}")
        return

    png_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.png')]
    png_files = [f for f in png_files if "177" in f or "fighter" in f.lower() or "keano" in f.lower() or "jayden" in f.lower() or f.endswith('png')]

    print(f"Found {len(png_files)} images to process.")

    for f in png_files:
        input_path = os.path.join(input_dir, f)
        process_image(input_path, clean_out_dir)
        
    print(f"\\nAll done! Clean images saved to {clean_out_dir}")

if __name__ == "__main__":
    main()
