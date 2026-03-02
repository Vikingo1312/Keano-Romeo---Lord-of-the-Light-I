import re
with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'<script>(.*?)</script>', text, re.DOTALL)
if m:
    with open('engine.js', 'w', encoding='utf-8') as js:
        js.write(m.group(1))
    print("Extracted JS to engine.js")
else:
    print("Could not find <script> tag")
