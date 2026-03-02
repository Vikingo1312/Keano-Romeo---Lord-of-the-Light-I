const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.log("No script tag found.");
  process.exit(1);
}

const jsCode = scriptMatch[1];
fs.writeFileSync('engine_dump.js', jsCode);

// Perform some basic static regex checks for common game engine leaks
let errors = [];

// 1. Check for unbalanced X.save() and X.restore()
const saves = (jsCode.match(/X\.save\(\)/g) || []).length;
const restores = (jsCode.match(/X\.restore\(\)/g) || []).length;
if (saves !== restores) {
  errors.push(`Canvas state imbalance: ${saves} saves vs ${restores} restores.`);
} else {
  console.log(`Canvas states balanced (${saves} pairs).`);
}

// 2. Check for continuous AudioContext creation in loops
const audioCtxCreations = jsCode.match(/new \(window\.AudioContext \|\| window\.webkitAudioContext\)/g);
console.log(`AudioContext instantiated ${audioCtxCreations ? audioCtxCreations.length : 0} times.`);

// 3. Look for DOM event listeners added without removal (potential leak if done in gameLoop)
const addListeners = (jsCode.match(/\.addEventListener/g) || []).length;
const removeListeners = (jsCode.match(/\.removeEventListener/g) || []).length;
console.log(`Event Listeners: ${addListeners} added, ${removeListeners} removed.`);

if (errors.length > 0) {
  console.log("\nFOUND POTENTIAL ISSUES:");
  errors.forEach(e => console.log("- " + e));
} else {
  console.log("\nBasic static checks passed.");
}
