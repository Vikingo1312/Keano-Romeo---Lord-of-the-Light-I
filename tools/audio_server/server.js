require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'DEIN_OPENAI_KEY'
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'DEIN_ELEVENLABS_KEY';

// Pre-defined Voice Pool categorized by archetype
const VOICE_POOL = {
    "young_male_energetic": "ErXwobaYiN019PkySvjV",   // Antoni
    "deep_threatening_male": "pNInz6obbfDQGcgMyIGb",  // Adam
    "synthetic_monotone": "ThT5KcBeYPX3keUQqHPh",     // Dorothy (robotic)
    "wise_old_male": "JBFqnCBcs6RMkjGVYIVR",          // Marcus
    "calm_whisper": "XB0fDUnXU5ywgI7N1iT2",           // Harry
    "aggressive_loud": "TxGEqnAI0114KC3D7m08",        // Clyde
    "default": "ErXwobaYiN019PkySvjV"
};

// Ensure directories exist
const OUTPUT_DIR = path.join(__dirname, 'output');
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

/**
 * 1. LLM generiert das Skript und weist Sprachtypen dynamisch zu
 */
async function generateScriptWithRoles(prompt) {
    console.log("🤖 [1/4] Analysiere Prompt mit LLM...");
    const systemPrompt = `
Du bist ein AI-Audio-Regisseur für ein Videospiel.
Analysiere den User-Prompt und zelege ihn in ein gesprochenes Dialog-Skript.
Weise jeder Rolle einen Archetyp zu. Unterstützte Archetypen:
- young_male_energetic
- deep_threatening_male
- synthetic_monotone
- wise_old_male
- calm_whisper
- aggressive_loud

Format als reines JSON Array (NICHT in Markdown-Codeblöcken verpacken):
[
  {
    "role": "Name der Rolle (z.B. HERO)",
    "archetype": "young_male_energetic",
    "text": "Gesprochener Text der Linie"
  }
]
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }.type ? undefined : undefined // json_object handling workaround below
    });

    try {
        let content = response.choices[0].message.content.trim();
        // Remove markdown formatting if LLM includes it despite instructions
        if (content.startsWith('```')) {
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        }
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.script || parsed.dialogue || []);
    } catch (error) {
        console.error("❌ JSON Parse Error:", error);
        throw new Error("Konnte das LLM Output nicht parsen.");
    }
}

/**
 * 2. Audio generieren (TTS mit ElevenLabs API)
 */
async function generateTTS(text, archetype, index) {
    const voiceId = VOICE_POOL[archetype] || VOICE_POOL["default"];
    const outputPath = path.join(TEMP_DIR, `line_${index}.mp3`);

    console.log(`🎙️ [2/4] Generiere Audio für Line ${index} (Archetype: ${archetype})...`);

    const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
        },
        data: {
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.35,
                similarity_boost: 0.75,
                style: 0.2
            }
        },
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(outputPath));
        writer.on('error', reject);
    });
}

/**
 * 3. FFmpeg: MP3s mit kurzen Pausen (Silence) zusammenfügen
 */
function mergeAudioFiles(filePaths, outputFilename) {
    console.log(`🎧 [3/4] FFmpeg mergt ${filePaths.length} Dateien...`);
    const finalPath = path.join(OUTPUT_DIR, outputFilename);
    const command = ffmpeg();

    filePaths.forEach(file => {
        command.input(file);
    });

    return new Promise((resolve, reject) => {
        command
            .on('error', (err) => {
                console.error('❌ FFmpeg Merge Error:', err.message);
                reject(err);
            })
            .on('end', () => {
                console.log(`✅ [4/4] Master-Mix erfolgreich erstellt: ${finalPath}`);
                resolve(finalPath);
            })
            .mergeToFile(finalPath, TEMP_DIR);
    });
}

// ==========================================
// 🚀 API ENDPOINT
// ==========================================
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "No prompt provided" });

        // 1. LLM Script Generation
        const script = await generateScriptWithRoles(prompt);
        if (script.length === 0) throw new Error("Generiertes Skript ist leer.");

        // 2. TTS Generation for each line
        const audioFiles = [];
        for (let i = 0; i < script.length; i++) {
            const line = script[i];
            const filePath = await generateTTS(line.text, line.archetype, i);
            audioFiles.push(filePath);

            // Sleep slightly to respect ElevenLabs rate limits
            await new Promise(r => setTimeout(r, 500));
        }

        // 3. Merging with FFmpeg
        const timestamp = Date.now();
        const finalFilename = `master_mix_${timestamp}.mp3`;
        const finalPath = await mergeAudioFiles(audioFiles, finalFilename);

        // 4. Cleanup Temp Files
        audioFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });

        res.json({
            success: true,
            script: script,
            audio_url: `/output/${finalFilename}`
        });

    } catch (error) {
        console.error("❌ Fehler in Pipeline:", error.message || error);
        res.status(500).json({ error: error.message || "Pipeline failed" });
    }
});

// Serve output files statically
app.use('/output', express.static(OUTPUT_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🔥 KEANO AUDIO PIPELINE SERVER RUNNING 🔥`);
    console.log(`========================================`);
    console.log(`Server lauscht auf http://localhost:${PORT}`);
    console.log(`Sende einen POST Request an /api/generate mit { "prompt": "..." }`);
});
