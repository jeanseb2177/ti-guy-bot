const fs = require('fs');
const path = require('path');

const STORE_FILE = '/tmp/tiguy_scripts.json';

// Charger les scripts depuis le fichier au demarrage
function loadFromFile() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
            return new Map(Object.entries(data));
        }
    } catch (e) {
        console.log('[STORE] Impossible de charger le fichier:', e.message);
    }
    return new Map();
}

// Sauvegarder sur disque
function saveToFile(scripts) {
    try {
        const obj = Object.fromEntries(scripts);
        fs.writeFileSync(STORE_FILE, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.log('[STORE] Impossible de sauvegarder:', e.message);
    }
}

const scripts = loadFromFile();
console.log(`[STORE] ${scripts.size} scripts charges depuis le disque`);

function saveScript(script) {
    scripts.set(script.id, script);
    saveToFile(scripts);
    return script;
}

function getScript(id) {
    return scripts.get(id);
}

function getAllScripts() {
    return Array.from(scripts.values()).sort((a, b) =>
        new Date(b.date_creation) - new Date(a.date_creation)
    );
}

function updateScript(id, updates) {
    const script = scripts.get(id);
    if (!script) return null;
    const updated = { ...script, ...updates };
    scripts.set(id, updated);
    saveToFile(scripts);
    return updated;
}

function deleteScript(id) {
    const result = scripts.delete(id);
    saveToFile(scripts);
    return result;
}

function getScriptsByStatut(statut) {
    return getAllScripts().filter(s => s.statut === statut);
}

module.exports = { saveScript, getScript, getAllScripts, updateScript, deleteScript, getScriptsByStatut };
