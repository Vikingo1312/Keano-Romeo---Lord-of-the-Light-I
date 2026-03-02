import urllib.request, json
url = "https://archive.org/advancedsearch.php?q=subject%3Asynthwave+AND+mediatype%3Aaudio&fl%5B%5D=identifier&output=json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    data = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    for doc in data["response"]["docs"][:5]:
        ident = doc["identifier"]
        meta_url = f"https://archive.org/metadata/{ident}"
        meta = json.loads(urllib.request.urlopen(urllib.request.Request(meta_url, headers={"User-Agent": "Mozilla/5.0"})).read().decode("utf-8"))
        for f in meta.get("files", []):
            if f["name"].endswith(".mp3"):
                print(f"https://archive.org/download/{ident}/{f['name']}")
                break
except Exception as e:
    print("Error:", e)
