import os
import re

directories = ['js']

for directory in directories:
    for filename in os.listdir(directory):
        if filename.endswith(".js"):
            filepath = os.path.join(directory, filename)
            with open(filepath, 'r') as f:
                content = f.read()
            
            # Use regex to find all !FX_BYPASS.prop and replace it with (FX_BYPASS.prop > 0.0)
            # Only matching alphanumeric + underscore properties
            new_content = re.sub(r'!FX_BYPASS\.([A-Za-z0-9_]+)', r'(typeof FX_BYPASS !== "undefined" ? FX_BYPASS.\1 : 1.0) > 0.0', content)
            
            # Special case for !FX_BYPASS.limbs where limbs previously was true but now 1.0 as Fader?
            # Actually, globals.js defined `limbs: 1.0`. So > 0.0 works perfectly.
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Fixed bypasses in {filename}")

