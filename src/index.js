<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ti-Guy Bot — Mon Camp de Base</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root{
    --pine:#1B3328;
    --pine-deep:#122419;
    --canvas:#EDE6D6;
    --canvas-dim:#E1D8C4;
    --ember:#D9662C;
    --ember-deep:#B84E1D;
    --moss:#6E8B6E;
    --charcoal:#2A2521;
    --paper:#F7F3E9;
    --danger:#B23A2E;
    --blue:#3E6B8A;
    --line: rgba(237,230,214,0.14);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:'Archivo',sans-serif;
    background:var(--pine);
    color:var(--canvas);
    background-image:
      repeating-linear-gradient(0deg, transparent 0 38px, rgba(237,230,214,0.035) 38px 39px),
      radial-gradient(ellipse 900px 500px at 15% -10%, rgba(217,102,44,0.10), transparent 60%);
    min-height:100vh;
  }
  .mono{font-family:'JetBrains Mono',monospace;}

  /* LOGIN */
  #login-screen{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;
    background:
      linear-gradient(180deg, rgba(18,36,25,0.55), rgba(18,36,25,0.85)),
      repeating-linear-gradient(115deg, rgba(237,230,214,0.05) 0 2px, transparent 2px 26px),
      var(--pine-deep);
  }
  .login-card{background:var(--paper);border-radius:4px;padding:44px 40px 36px;width:380px;text-align:center;
    position:relative; color:var(--charcoal);
    box-shadow:0 30px 70px rgba(0,0,0,0.45);
    border:1px solid rgba(0,0,0,0.06);
  }
  .login-card::before{content:'';position:absolute;inset:10px;border:1.5px dashed rgba(42,37,33,0.22);border-radius:2px;pointer-events:none;}
  .stamp{width:56px;height:56px;border-radius:50%;border:2px solid var(--ember);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:26px;transform:rotate(-6deg);box-shadow:0 0 0 3px var(--paper), 0 0 0 4px rgba(217,102,44,0.35);}
  .login-card h1{font-family:'Archivo Black',sans-serif;font-size:21px;letter-spacing:0.02em;margin-bottom:4px;text-transform:uppercase;}
  .login-card .sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ember-deep);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:26px;}
  .login-card input{width:100%;padding:13px 14px;border:1.5px solid #d8cfba;border-radius:3px;font-size:14.5px;margin-bottom:12px;outline:none;background:#fff;font-family:'Archivo',sans-serif;}
  .login-card input:focus{border-color:var(--ember);}
  .login-card button{width:100%;padding:13px;background:var(--pine);color:var(--canvas);border:none;border-radius:3px;font-size:13.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;transition:background .15s;}
  .login-card button:hover{background:var(--pine-deep);}
  .login-error{color:var(--danger);font-size:12.5px;margin-top:10px;font-family:'JetBrains Mono',monospace;}

  /* HEADER */
  #app{display:none;}
  header{
    position:relative; overflow:hidden;
    background:linear-gradient(100deg, var(--pine-deep), var(--pine) 70%);
    padding:0 28px;display:flex;align-items:center;justify-content:space-between;height:72px;
    border-bottom:3px solid var(--ember);
  }
  header::before{content:'';position:absolute;inset:0;opacity:0.5;
    background-image:
      radial-gradient(circle at 20% 50%, transparent 0 22px, rgba(237,230,214,0.05) 23px 24px, transparent 25px),
      radial-gradient(circle at 60% 30%, transparent 0 34px, rgba(237,230,214,0.04) 35px 36px, transparent 37px),
      radial-gradient(circle at 85% 70%, transparent 0 16px, rgba(237,230,214,0.05) 17px 18px, transparent 19px);
    pointer-events:none;
  }
  header .brand{position:relative;display:flex;align-items:center;gap:14px;}
  .brand-mark{width:42px;height:42px;border-radius:50%;background:var(--ember);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;box-shadow:0 0 0 3px var(--pine-deep), 0 0 0 4px rgba(217,102,44,0.4);}
  .brand-text .name{font-family:'Archivo Black',sans-serif;font-size:16px;letter-spacing:0.02em;text-transform:uppercase;}
  .brand-text .tag{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--moss);letter-spacing:0.05em;margin-top:1px;}
  .status-badge{position:relative;font-family:'JetBrains Mono',monospace;background:rgba(237,230,214,0.08);border:1px solid var(--line);padding:6px 14px;border-radius:20px;font-size:11.5px;}
  .status-badge.active{border-color:rgba(110,139,110,0.6);color:#9FC49F;}

  /* TABS — patch style */
  .tabs{background:var(--pine-deep);padding:14px 28px 0;display:flex;gap:10px;border-bottom:1px solid var(--line);flex-wrap:wrap;}
  .tab{position:relative;padding:10px 18px 12px;cursor:pointer;font-size:12.5px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;color:rgba(237,230,214,0.55);
    border:1.5px dashed transparent; border-bottom:none; border-radius:8px 8px 0 0; transition:all .15s;}
  .tab:hover{color:var(--canvas);}
  .tab.active{color:var(--charcoal);background:var(--canvas);border-color:var(--canvas);}
  .tab .badge{background:var(--ember);color:#fff;font-family:'JetBrains Mono',monospace;font-size:10px;padding:2px 6px;border-radius:8px;margin-left:6px;}

  /* CONTENT */
  .content{padding:28px;max-width:1180px;margin:0 auto;}
  .tab-content{display:none;}
  .tab-content.active{display:block;}

  /* STATS — patch badges */
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px;}
  .stat-card{background:var(--canvas);border-radius:6px;padding:18px 16px;text-align:center;position:relative;
    border:1px solid rgba(0,0,0,0.08); box-shadow:0 6px 16px rgba(0,0,0,0.18);}
  .stat-card::after{content:'';position:absolute;inset:6px;border:1px dashed rgba(42,37,33,0.16);border-radius:3px;pointer-events:none;}
  .stat-card .number{font-family:'Archivo Black',sans-serif;font-size:30px;color:var(--pine);position:relative;}
  .stat-card .label{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--charcoal);opacity:0.65;margin-top:4px;letter-spacing:0.04em;text-transform:uppercase;}

  /* GENERATE SECTION */
  .generate-section{background:var(--canvas);border-radius:6px;padding:24px;margin-bottom:22px;
    border:1px solid rgba(0,0,0,0.08); box-shadow:0 6px 16px rgba(0,0,0,0.18); color:var(--charcoal);}
  .generate-section h2{font-family:'Archivo Black',sans-serif;font-size:14.5px;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.02em;color:var(--pine);
    display:flex; align-items:center; gap:8px;}
  .gen-buttons{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
  .btn{padding:11px 20px;border:none;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:0.02em;cursor:pointer;transition:all .15s;text-transform:uppercase;font-family:'Archivo',sans-serif;}
  .btn-primary{background:var(--pine);color:var(--canvas);}
  .btn-primary:hover{background:var(--pine-deep);}
  .btn-secondary{background:var(--ember);color:#fff;}
  .btn-secondary:hover{background:var(--ember-deep);}
  .btn-custom{background:var(--blue);color:#fff;}
  .btn-custom:hover{background:#325977;}
  .btn-sm{padding:7px 13px;font-size:11px;border-radius:4px;}
  .btn-approve{background:var(--moss);color:#fff;}
  .btn-reject{background:var(--danger);color:#fff;}
  .btn-regen{background:#B8862F;color:#fff;}
  .btn-delete{background:#8A8272;color:#fff;}
  .btn-publish{background:var(--blue);color:#fff;}

  .input-row{display:flex;gap:12px;}
  .input-row input{flex:1;padding:11px 14px;border:1.5px solid #d8cfba;border-radius:4px;font-size:13.5px;outline:none;background:#fff;font-family:'Archivo',sans-serif;}
  .input-row input:focus{border-color:var(--ember);}
  .custom-textarea{width:100%;padding:12px 14px;border:1.5px solid #d8cfba;border-radius:4px;font-size:13.5px;resize:vertical;min-height:80px;outline:none;margin-bottom:12px;font-family:'Archivo',sans-serif;}
  .custom-textarea:focus{border-color:var(--blue);}

  /* SCRIPT CARDS */
  .scripts-list{display:flex;flex-direction:column;gap:16px;}
  .script-card{background:var(--canvas);border-radius:6px;padding:20px;color:var(--charcoal);
    border:1px solid rgba(0,0,0,0.08); box-shadow:0 6px 16px rgba(0,0,0,0.18);
    border-left:5px solid #ccc; position:relative;}
  .script-card.en_attente{border-left-color:#B8862F;}
  .script-card.approuve{border-left-color:var(--moss);}
  .script-card.rejete{border-left-color:var(--danger);}
  .script-card.publie{border-left-color:var(--blue);}
  .script-card.video_en_cours{border-left-color:#8A5FB0;}
  .script-card.video_prete{border-left-color:#1E9E8B;}

  .card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;}
  .card-title{font-family:'Archivo Black',sans-serif;font-size:14.5px;letter-spacing:0.01em;}
  .card-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}

  /* PATCH BADGES — signature element */
  .type-badge, .statut-badge{
    font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600;
    padding:4px 10px 4px 9px; border-radius:20px; letter-spacing:0.03em; text-transform:uppercase;
    border:1.5px dashed currentColor; position:relative;
  }
  .type-conseil{color:var(--pine); background:rgba(27,51,40,0.07);}
  .type-revue{color:var(--ember-deep); background:rgba(217,102,44,0.08);}
  .type-custom{color:var(--blue); background:rgba(62,107,138,0.08);}
  .statut-en_attente{color:#8A6415; background:rgba(184,134,47,0.1);}
  .statut-approuve{color:#3E6B4E; background:rgba(110,139,110,0.12);}
  .statut-rejete{color:var(--danger); background:rgba(178,58,46,0.08);}
  .statut-publie{color:var(--blue); background:rgba(62,107,138,0.08);}
  .statut-video_en_cours{color:#6B3F92; background:rgba(138,95,176,0.1);}
  .statut-video_prete{color:#136F60; background:rgba(30,158,139,0.1);}

  .script-text{background:var(--paper);border-radius:4px;padding:15px;font-size:13px;line-height:1.65;color:var(--charcoal);margin-bottom:12px;white-space:pre-wrap;border:1px solid rgba(0,0,0,0.06);}
  .hashtags{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--blue);margin-bottom:12px;}
  .card-actions{display:flex;gap:8px;flex-wrap:wrap;}
  .card-date{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--charcoal);opacity:0.5;margin-bottom:10px;}

  .video-preview{margin-top:4px;margin-bottom:10px;}
  .video-preview a{color:#136F60;font-size:12.5px;font-weight:700;text-decoration:none;}

  /* LOADING */
  .loading{display:none;padding:18px;text-align:center;color:var(--charcoal);opacity:0.7;font-size:13px;font-family:'JetBrains Mono',monospace;}
  .spinner{display:inline-block;width:16px;height:16px;border:2.5px solid #d8cfba;border-top-color:var(--ember);border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:middle;}
  @keyframes spin{to{transform:rotate(360deg);}}

  .empty-state{text-align:center;padding:60px 20px;color:var(--canvas);opacity:0.45;}
  .empty-state .icon{font-size:40px;margin-bottom:10px;}

  /* SAISON BANNER */
  .saison-banner{background:linear-gradient(120deg, var(--pine-deep), var(--pine));border:1px solid rgba(217,102,44,0.3);color:var(--canvas);border-radius:6px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;}
  .saison-banner .icon{font-size:26px;}
  .saison-banner h3{font-family:'Archivo Black',sans-serif;font-size:13.5px;text-transform:uppercase;letter-spacing:0.02em;margin-bottom:2px;}
  .saison-banner p{font-family:'JetBrains Mono',monospace;font-size:11px;opacity:0.75;}

  .alert{padding:12px 16px;border-radius:4px;margin-bottom:16px;font-size:12.5px;font-family:'JetBrains Mono',monospace;}
  .alert-success{background:rgba(110,139,110,0.12);color:#3E6B4E;border:1px solid rgba(110,139,110,0.4);}
  .alert-error{background:rgba(178,58,46,0.08);color:var(--danger);border:1px solid rgba(178,58,46,0.35);}

  @media (max-width:640px){
    .content{padding:16px;}
    header{padding:0 16px;}
    .tabs{padding:10px 16px 0;}
  }
</style>
</head>
<body>

<!-- LOGIN -->
<div id="login-screen">
  <div class="login-card">
    <div class="stamp">🏕️</div>
    <h1>Ti-Guy Bot</h1>
    <div class="sub">Mon Camp de Base · Poste de contrôle</div>
    <input type="password" id="password-input" placeholder="Mot de passe" onkeydown="if(event.key==='Enter')login()">
    <button onclick="login()">Entrer au camp</button>
    <div class="login-error" id="login-error"></div>
  </div>
</div>

<!-- APP -->
<div id="app">
  <header>
    <div class="brand">
      <div class="brand-mark">🏕️</div>
      <div class="brand-text">
        <div class="name">Ti-Guy Bot</div>
        <div class="tag">Mon Camp de Base — Studio de contenu</div>
      </div>
    </div>
    <div id="server-status" class="status-badge">Chargement...</div>
  </header>

  <div class="tabs">
    <div class="tab active" onclick="showTab('dashboard')">📊 Dashboard</div>
    <div class="tab" onclick="showTab('generer')">✨ Générer</div>
    <div class="tab" onclick="showTab('en-attente')">⏳ En attente <span class="badge" id="badge-attente">0</span></div>
    <div class="tab" onclick="showTab('tous')">📋 Tous les scripts</div>
  </div>

  <div class="content">

    <!-- DASHBOARD -->
    <div class="tab-content active" id="tab-dashboard">
      <div id="saison-banner" class="saison-banner">
        <div class="icon">🌿</div>
        <div>
          <h3>Saison : <span id="saison-nom">...</span></h3>
          <p>Mardi & Jeudi 8h Europe/Paris — génération automatique active</p>
        </div>
      </div>
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card"><div class="number" id="stat-total">0</div><div class="label">Scripts total</div></div>
        <div class="stat-card"><div class="number" id="stat-attente">0</div><div class="label">En attente</div></div>
        <div class="stat-card"><div class="number" id="stat-approuves">0</div><div class="label">Approuvés</div></div>
        <div class="stat-card"><div class="number" id="stat-publies">0</div><div class="label">Publiés</div></div>
      </div>
      <div class="generate-section">
        <h2>⚡ Génération rapide</h2>
        <div class="gen-buttons">
          <button class="btn btn-primary" onclick="genererConseil()">🎯 Conseil du mardi</button>
          <button class="btn btn-secondary" onclick="genererRevue()">⭐ Revue du jeudi</button>
        </div>
        <div id="loading-dashboard" class="loading"><span class="spinner"></span>Ti-Guy réfléchit...</div>
        <div id="alert-dashboard"></div>
      </div>
    </div>

    <!-- GENERER -->
    <div class="tab-content" id="tab-generer">
      <div class="generate-section">
        <h2>🎯 Conseil Plein Air (Mardi)</h2>
        <div class="input-row">
          <input type="text" id="sujet-conseil" placeholder="Sujet (ex: choisir ses chaussures) — vide = aléatoire">
          <button class="btn btn-primary" onclick="genererConseil('generer')">Générer</button>
        </div>
        <div id="loading-conseil" class="loading"><span class="spinner"></span>Ti-Guy rédige...</div>
        <div id="alert-conseil"></div>
      </div>

      <div class="generate-section">
        <h2>⭐ Revue Produit (Jeudi)</h2>
        <div class="input-row">
          <input type="text" id="sujet-revue" placeholder="Produit (ex: poncho imperméable) — vide = aléatoire">
          <button class="btn btn-secondary" onclick="genererRevue('generer')">Générer</button>
        </div>
        <div id="loading-revue" class="loading"><span class="spinner"></span>Ti-Guy teste le produit...</div>
        <div id="alert-revue"></div>
      </div>

      <div class="generate-section">
        <h2>✨ Script Custom</h2>
        <textarea class="custom-textarea" id="instructions-custom" placeholder="Décris la vidéo que tu veux... Ex: Ti-Guy sous la pluie au Mont Blanc avec son poncho, heureux comme un roi, il recommande moncampdebase.com"></textarea>
        <button class="btn btn-custom" onclick="genererCustom()">Générer script custom</button>
        <div id="loading-custom" class="loading"><span class="spinner"></span>Ti-Guy improvise...</div>
        <div id="alert-custom"></div>
      </div>
    </div>

    <!-- EN ATTENTE -->
    <div class="tab-content" id="tab-en-attente">
      <div id="scripts-attente" class="scripts-list">
        <div class="empty-state"><div class="icon">✅</div><p>Aucun script en attente d'approbation</p></div>
      </div>
    </div>

    <!-- TOUS -->
    <div class="tab-content" id="tab-tous">
      <div id="scripts-tous" class="scripts-list">
        <div class="empty-state"><div class="icon">📋</div><p>Aucun script généré pour l'instant</p></div>
      </div>
    </div>

  </div>
</div>

<script>
let AUTH_TOKEN = '';

function login() {
    const pwd = document.getElementById('password-input').value;
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
    }).then(r => r.json()).then(data => {
        if (data.success) {
            AUTH_TOKEN = data.token;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            loadStatus();
            loadScripts();
        } else {
            document.getElementById('login-error').textContent = 'Mot de passe incorrect';
        }
    });
}

function api(path, method='GET', body=null) {
    return fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-auth-token': AUTH_TOKEN },
        body: body ? JSON.stringify(body) : null
    }).then(r => r.json());
}

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[onclick="showTab('${tab}')"]`).classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'en-attente' || tab === 'tous') loadScripts();
}

function loadStatus() {
    api('/api/status').then(data => {
        document.getElementById('server-status').textContent = '🟢 ' + data.status;
        document.getElementById('server-status').className = 'status-badge active';
        document.getElementById('stat-total').textContent = data.scripts_total;
        document.getElementById('stat-attente').textContent = data.en_attente;
        document.getElementById('stat-approuves').textContent = data.approuves;
        document.getElementById('stat-publies').textContent = data.publies;
        document.getElementById('badge-attente').textContent = data.en_attente;
    });
}

function loadScripts() {
    api('/api/scripts').then(scripts => {
        const attente = scripts.filter(s => s.statut === 'en_attente' || s.statut === 'video_en_cours' || s.statut === 'video_prete');
        document.getElementById('badge-attente').textContent = attente.length;
        renderScripts('scripts-attente', attente);
        renderScripts('scripts-tous', scripts);
    });
}

function renderScripts(containerId, scripts) {
    const container = document.getElementById(containerId);
    if (!scripts.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Aucun script ici</p></div>';
        return;
    }
    container.innerHTML = scripts.map(s => `
        <div class="script-card ${s.statut}" id="card-${s.id}">
            <div class="card-header">
                <div class="card-title">${s.titre}</div>
                <div class="card-meta">
                    <span class="type-badge type-${s.type}">${s.type === 'conseil' ? '🎯 Conseil' : s.type === 'revue' ? '⭐ Revue' : '✨ Custom'}</span>
                    <span class="statut-badge statut-${s.statut}">${formatStatut(s.statut)}</span>
                </div>
            </div>
            <div class="card-date">Généré le ${new Date(s.date_creation).toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            <div class="script-text">${s.script}</div>
            <div class="hashtags">#${s.hashtags.replace(/,\s*/g, ' #')}</div>
            ${s.video_url ? `<div class="video-preview">🎬 <a href="${s.video_url}" target="_blank">Voir la vidéo Ti-Guy</a></div>` : ''}
            <div class="card-actions">
                ${s.statut === 'en_attente' || s.statut === 'video_prete' ? `
                    <button class="btn btn-sm btn-approve" onclick="approuver('${s.id}')">✅ Approuver</button>
                    <button class="btn btn-sm btn-reject" onclick="rejeter('${s.id}')">❌ Rejeter</button>
                ` : ''}
                ${s.statut === 'approuve' ? `<button class="btn btn-sm btn-publish" onclick="publier('${s.id}')">📤 Marquer publié</button>` : ''}
                ${s.statut === 'video_en_cours' ? `<button class="btn btn-sm btn-regen" onclick="checkVideo('${s.id}')">🔄 Vérifier vidéo</button>` : ''}
                <button class="btn btn-sm btn-regen" onclick="regenerer('${s.id}')">🔄 Régénérer</button>
                <button class="btn btn-sm btn-delete" onclick="supprimer('${s.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function formatStatut(s) {
    const map = { en_attente:'⏳ En attente', approuve:'✅ Approuvé', rejete:'❌ Rejeté', publie:'📤 Publié', video_en_cours:'🎬 Vidéo en cours', video_prete:'🎬 Vidéo prête' };
    return map[s] || s;
}

function showAlert(containerId, message, type='success') {
    const el = document.getElementById(containerId);
    el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => el.innerHTML = '', 4000);
}

function showLoading(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
}

async function genererConseil(context='dashboard') {
    const sujetEl = document.getElementById('sujet-conseil');
    const sujet = sujetEl ? sujetEl.value : '';
    showLoading('loading-' + context, true);
    try {
        const script = await api('/api/generate/conseil', 'POST', { sujet: sujet || null });
        showLoading('loading-' + context, false);
        showAlert('alert-' + context, `✅ Script généré: "${script.titre}"`);
        loadStatus(); loadScripts();
        if (sujetEl) sujetEl.value = '';
    } catch(e) {
        showLoading('loading-' + context, false);
        showAlert('alert-' + context, '❌ Erreur: ' + e.message, 'error');
    }
}

async function genererRevue(context='dashboard') {
    const sujetEl = document.getElementById('sujet-revue');
    const sujet = sujetEl ? sujetEl.value : '';
    showLoading('loading-' + (context === 'dashboard' ? 'dashboard' : 'revue'), true);
    try {
        const script = await api('/api/generate/revue', 'POST', { produit: sujet || null });
        showLoading('loading-' + (context === 'dashboard' ? 'dashboard' : 'revue'), false);
        showAlert('alert-' + (context === 'dashboard' ? 'dashboard' : 'revue'), `✅ Script généré: "${script.titre}"`);
        loadStatus(); loadScripts();
        if (sujetEl) sujetEl.value = '';
    } catch(e) {
        showLoading('loading-' + (context === 'dashboard' ? 'dashboard' : 'revue'), false);
        showAlert('alert-' + (context === 'dashboard' ? 'dashboard' : 'revue'), '❌ Erreur: ' + e.message, 'error');
    }
}

async function genererCustom() {
    const instructions = document.getElementById('instructions-custom').value;
    if (!instructions) return alert('Entre des instructions pour Ti-Guy !');
    showLoading('loading-custom', true);
    try {
        const script = await api('/api/generate/custom', 'POST', { instructions });
        showLoading('loading-custom', false);
        showAlert('alert-custom', `✅ Script généré: "${script.titre}"`);
        document.getElementById('instructions-custom').value = '';
        loadStatus(); loadScripts();
    } catch(e) {
        showLoading('loading-custom', false);
        showAlert('alert-custom', '❌ Erreur: ' + e.message, 'error');
    }
}

async function approuver(id) {
    await api(`/api/scripts/${id}/approuver`, 'POST');
    loadScripts(); loadStatus();
}

async function rejeter(id) {
    await api(`/api/scripts/${id}/rejeter`, 'POST');
    loadScripts(); loadStatus();
}

async function publier(id) {
    await api(`/api/scripts/${id}/publier`, 'POST');
    loadScripts(); loadStatus();
}

async function regenerer(id) {
    if (!confirm('Régénérer ce script ?')) return;
    await api(`/api/scripts/${id}/regenerer`, 'POST');
    loadScripts();
}

async function supprimer(id) {
    if (!confirm('Supprimer ce script ?')) return;
    await api(`/api/scripts/${id}`, 'DELETE');
    loadScripts(); loadStatus();
}

async function checkVideo(id) {
    const status = await api(`/api/scripts/${id}/video-status`);
    if (status.video_url) {
        alert('🎬 Vidéo prête ! Actualisation...');
    } else {
        alert('⏳ Vidéo encore en cours de génération (' + status.status + ')');
    }
    loadScripts();
}

// Saison banner
const saisons = { hiver: {icon:'❄️', label:'Hiver'}, printemps:{icon:'🌿', label:'Printemps'}, ete:{icon:'☀️', label:'Été'}, automne:{icon:'🍂', label:'Automne'} };
const mois = new Date().getMonth() + 1;
const saison = [12,1,2].includes(mois) ? 'hiver' : [3,4,5].includes(mois) ? 'printemps' : [6,7,8].includes(mois) ? 'ete' : 'automne';
document.getElementById('saison-nom').textContent = saisons[saison].label;
document.querySelector('.saison-banner .icon').textContent = saisons[saison].icon;

// Refresh auto toutes les 30 secondes
setInterval(() => { loadStatus(); }, 30000);
</script>
</body>
</html>
