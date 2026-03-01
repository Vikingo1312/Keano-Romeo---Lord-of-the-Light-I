# KEANO AUDIO PIPELINE SERVER 🎙️🤖

Dies ist der vollautomatische Node.js Backend-Server für die Audio-Generierung.

## Architektur
1. **POST Request:** Sendet einen `prompt` an den Server.
2. **OpenAI LLM:** Generiert ein Dialog-Skript (JSON) und weist jedem Sprecher automatisch einen Archetyp zu.
3. **Voice Mapping:** Der Server mappt den Archetyp (z.B. `deep_threatening_male`) auf eine spezifische ElevenLabs Voice-ID.
4. **ElevenLabs TTS:** Generiert für jede Dialogzeile eine MP3 per API.
5. **FFmpeg:** Fügt die einzelnen MP3-Dateien automatisch zu einem einzigen Master-Mix (`master_mix_XYZ.mp3`) zusammen.

## Setup & Start

1. Öffne das Terminal in diesem Ordner:
   ```bash
   cd ~/.gemini/antigravity/scratch/keano_gta/tools/audio_server
   ```

2. Installiere die Abhängigkeiten (bereits passiert, aber zur Sicherheit):
   ```bash
   npm install
   ```

3. Erstelle eine `.env` Datei in diesem Ordner und füge deine API-Keys ein:
   ```env
   OPENAI_API_KEY=sk-dein-openai-key
   ELEVENLABS_API_KEY=dein-elevenlabs-key
   ```

4. Starte den Server:
   ```bash
   npm start
   ```
   *(Alternativ: `node server.js`)*

## Nutzung (API Testen)

Sende einen POST-Request an den Server (z.B. mit Postman, cURL oder aus deinem Frontend):

```bash
curl -X POST http://localhost:3000/api/generate \
-H "Content-Type: application/json" \
-d '{"prompt": "Ein kurzer epischer Dialog zwischen dem heldenhaften Keano und dem bösen Vikingo über das Schicksal der Galaxie."}'
```

**Antwort (Response):**
```json
{
  "success": true,
  "script": [
    {
      "role": "Keano",
      "archetype": "young_male_energetic",
      "text": "Dein Krieg endet hier, Vater!"
    },
    {
      "role": "Vikingo",
      "archetype": "deep_threatening_male",
      "text": "Das Universum brennt für mich, Junge."
    }
  ],
  "audio_url": "/output/master_mix_17123982931.mp3"
}
```

Die fertige Datei liegt danach im lokalen Ordner `output`.
