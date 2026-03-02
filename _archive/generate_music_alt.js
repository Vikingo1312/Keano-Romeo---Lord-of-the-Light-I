const { execSync } = require('child_process');
const fs = require('fs');

console.log("Downloading working aggressive arcade action beat...");
execSync('curl -sL "https://cdn.pixabay.com/download/audio/2022/10/25/audio_29fb6ee4db.mp3?filename=aggressive-street-114241.mp3" -o assets/beat2.mp3');

console.log("Downloading working dark action synth beat...");
execSync('curl -sL "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=retro-wave-style-track-115321.mp3" -o assets/beat4.mp3');

console.log("Music downloaded successfully.");
