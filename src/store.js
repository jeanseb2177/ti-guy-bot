// Stockage en memoire des scripts et videos
const scripts = new Map();
const videos = new Map();

function saveScript(script) {
    scripts.set(script.id, script);
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
    return updated;
}

function deleteScript(id) {
    return scripts.delete(id);
}

function getScriptsByStatut(statut) {
    return getAllScripts().filter(s => s.statut === statut);
}

module.exports = { saveScript, getScript, getAllScripts, updateScript, deleteScript, getScriptsByStatut };
