const { execSync } = require('child_process');
const fs = require('fs');

console.log("Downloading aggressive arcade action beat 1...");
execSync('curl -sL "https://cdn.pixabay.com/download/audio/2022/10/18/audio_2d8b88d227.mp3?filename=cyberpunk-street-114227.mp3" -o assets/beat2.mp3');

console.log("Downloading intense retro boss beat...");
execSync('curl -sL "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=retro-wave-style-track-115321.mp3" -o assets/beat3.mp3');

console.log("Downloading dark action synth beat...");
execSync('curl -sL "https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b2c938c5b.mp3?filename=action-stylish-rock-126202.mp3" -o assets/beat4.mp3');

console.log("Music downloaded successfully.");
