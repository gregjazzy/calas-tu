/* ============================================================
   CALASTU — Logique de jeu, navigation, état, persistance
   ============================================================ */

const STORAGE_KEY = 'calastu_v1';

/* ---------- État global ---------- */
const state = {
  data: null,        // sauvegarde complète
  current: null,     // profil actuel
  session: null,     // session d'exercice en cours
};

/* ---------- Persistance ---------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.data = JSON.parse(raw);
  } catch(e) { console.warn('load fail', e); }
  if (!state.data) state.data = { profiles: [], lastProfile: null, lessonsRead: {} };
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); }
  catch(e) { console.warn('save fail', e); }
}

/* ---------- Profils ---------- */
/* Avatar enrichi avec accessoire selon le niveau */
function avatarHTML(profile) {
  const lvl = levelFor(profile.xp).level;
  const acc = accessoryFor(lvl);
  if (!acc.emoji) return profile.avatar;
  return `<span class="av-with-acc">${profile.avatar}<span class="acc">${acc.emoji}</span></span>`;
}

function newProfile(name, avatar, classe) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    name, avatar, classe,
    xp: 0, level: 1,
    stages: {},
    trophies: {},
    streakBest: 0,
    survivalBest: 0,
    dailyDone: 0,
    dailyDate: null,
    lessonsRead: [],
    dayStreak: 0,
    lastPlayDay: null,
    dayStreakBest: 0,
    visitedWorlds: [],
    fastAnswers: 0,
    consecutiveErrors: 0,
    sessionXP: 0,
    /* Historique d'activité : { 'YYYY-MM-DD': { exos: 12, correct: 10, xp: 80, minutes: 8 } } */
    activity: {},
    /* Total temps joué en minutes (cumul) */
    totalMinutes: 0,
    /* Astuces vues récemment pour le wrapped favori */
    favTrick: null,
    /* Système de révision espacée + faiblesses :
       skills[drillKey] = {
         seen: int, correct: int, errors: int,
         lastSeen: timestamp, nextReview: timestamp,
         box: 1..5  (Leitner box, plus haut = mieux acquis)
       }
    */
    skills: {},
    created: Date.now(),
  };
}

/* ===== Révision espacée (Leitner) =====
   Intervalles entre révisions : box 1 = 1 jour, 2 = 3j, 3 = 7j, 4 = 14j, 5 = 30j */
const LEITNER_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

/* ============================================================
   TOURNOI HEBDOMADAIRE — classement entre profils sur les 7 derniers jours
   ============================================================ */

function weekKey(d = new Date()) {
  // ISO week (lundi-dimanche). On fait simple : YYYY-Wnn
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weeklyXPFor(profile) {
  // Somme des XP des 7 derniers jours
  const today = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const a = (profile.activity || {})[key];
    if (a) total += a.xp || 0;
  }
  return total;
}

function tournamentRanking() {
  return state.data.profiles
    .map(p => ({ profile: p, weekly: weeklyXPFor(p) }))
    .sort((a, b) => b.weekly - a.weekly);
}

/* Enregistre le titre "Champion de la semaine" en début de nouvelle semaine */
function checkWeeklyChampion() {
  if (state.data.profiles.length < 2) return;
  const currentWeek = weekKey();
  const lastChecked = state.data.lastWeekChampionCheck;
  if (lastChecked === currentWeek) return; // déjà fait cette semaine
  // Si une semaine précédente vient de se finir, on archive le champion
  state.data.lastWeekChampionCheck = currentWeek;
  state.data.weeklyChampions = state.data.weeklyChampions || [];
  // Calcule sur la semaine PRÉCÉDENTE
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const prev = state.data.profiles.map(p => {
    let total = 0;
    for (let i = 7; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const a = (p.activity || {})[key];
      if (a) total += a.xp || 0;
    }
    return { id: p.id, name: p.name, xp: total };
  }).filter(x => x.xp > 0)
    .sort((a, b) => b.xp - a.xp);
  if (prev.length > 0 && prev[0].xp >= 50) { // au moins 50 XP pour être champion
    state.data.weeklyChampions.unshift({
      week: weekKey(lastWeek),
      champion: prev[0],
      podium: prev.slice(0, 3),
    });
    if (state.data.weeklyChampions.length > 8) state.data.weeklyChampions.length = 8;
    saveData();
  }
}

/* Enregistre l'activité du jour (pour heatmap parent + wrapped) */
function recordActivity(profile, exos, correct, xp, seconds) {
  const today = new Date().toISOString().slice(0, 10);
  profile.activity = profile.activity || {};
  const a = profile.activity[today] = profile.activity[today] || { exos: 0, correct: 0, xp: 0, seconds: 0 };
  a.exos += exos;
  a.correct += correct;
  a.xp += xp;
  a.seconds += seconds;
  profile.totalMinutes = (profile.totalMinutes || 0) + (seconds / 60);
}

function recordSkill(profile, drillKey, correct) {
  // Conservé pour compat — utilise l'évaluation binaire
  recordSkillStatus(profile, drillKey, correct ? 'MASTERED' : 'WRONG', null);
}

function recordSkillStatus(profile, drillKey, status, elapsed) {
  if (!drillKey) return;
  const s = profile.skills[drillKey] = profile.skills[drillKey] || {
    seen: 0, correct: 0, errors: 0, box: 1, lastSeen: 0, nextReview: 0,
    mastered: 0, slow: 0, avgTime: null, bestTime: null,
  };
  s.seen++;
  s.lastSeen = Date.now();

  // Mise à jour vitesse moyenne et meilleure
  if (elapsed != null && status !== 'WRONG') {
    s.avgTime = s.avgTime == null ? elapsed : (s.avgTime * 0.7 + elapsed * 0.3);
    if (s.bestTime == null || elapsed < s.bestTime) s.bestTime = elapsed;
  }

  if (status === 'MASTERED') {
    s.correct++;
    s.mastered = (s.mastered || 0) + 1;
    s.box = Math.min(5, s.box + 1); // monte vraiment
  } else if (status === 'CORRECT') {
    s.correct++;
    // Bon mais sans astuce — on ne monte PAS la box (l'astuce n'est pas réflexe)
    // Mais on ne descend pas non plus. C'est neutre.
  } else if (status === 'SLOW') {
    s.correct++;
    s.slow = (s.slow || 0) + 1;
    s.box = Math.max(1, s.box - 1); // calcul brut → l'astuce n'est pas là, à retravailler
  } else { // WRONG
    s.errors++;
    s.box = Math.max(1, s.box - 1);
  }
  const dueIn = LEITNER_DAYS[s.box] * 86400000;
  s.nextReview = Date.now() + dueIn;
}

/* Renvoie la liste des drillKeys "à réviser" (nextReview dépassé) triés par urgence */
function dueSkills(profile) {
  const now = Date.now();
  return Object.entries(profile.skills || {})
    .filter(([k, s]) => s.seen >= 3 && s.nextReview && s.nextReview <= now)
    .sort((a, b) => a[1].nextReview - b[1].nextReview)
    .map(([k]) => k);
}

/* Renvoie les drillKeys "faibles" : taux d'erreur > 30% sur au moins 5 essais */
function weakSkills(profile) {
  return Object.entries(profile.skills || {})
    .filter(([k, s]) => s.seen >= 5 && s.errors / s.seen > 0.3)
    .sort((a, b) => (b[1].errors / b[1].seen) - (a[1].errors / a[1].seen))
    .map(([k]) => k);
}

/* Révisions URGENTES (en retard de plus de 1 jour ou taux d'erreur élevé) */
function urgentSkills(profile) {
  const now = Date.now();
  return Object.entries(profile.skills || {})
    .filter(([k, s]) => {
      if (s.seen < 3) return false;
      // En retard de plus de 24h sur la révision
      if (s.nextReview && (now - s.nextReview) > 86400000) return true;
      // Très faible
      if (s.seen >= 5 && s.errors / s.seen > 0.5) return true;
      return false;
    })
    .map(([k]) => k);
}

/* L'enfant peut-il accéder à du nouveau contenu ?
   Bloqué si plus de 5 révisions urgentes en retard. */
function isReviewBlocked(profile) {
  return urgentSkills(profile).length >= 5;
}

/* Trouve le prochain stage non-3★ pour proposer la suite naturelle */
function nextStageToDo(profile) {
  for (const w of WORLDS) {
    // Vérifie monde déverrouillé
    const wIdx = WORLDS.indexOf(w);
    if (wIdx > 0) {
      const prev = WORLDS[wIdx - 1];
      const anyDone = prev.stages.some((_, i) => profile.stages[`${prev.id}_${i}`]?.completed);
      if (!anyDone) continue;
    }
    for (let i = 0; i < w.stages.length; i++) {
      const stage = w.stages[i];
      if (stage.drill) continue; // les drill sont optionnels (suggestion ad hoc)
      const k = `${w.id}_${i}`;
      const saved = profile.stages[k];
      // Premier non commencé → prio
      if (!saved) {
        // Vérifie déverrouillage interne (stage précédent joué)
        if (i > 0 && !profile.stages[`${w.id}_${i-1}`]) continue;
        return { world: w, stageIdx: i, stage, reason: 'new' };
      }
      // Si pas 3★, à compléter
      if ((saved.stars || 0) < 3) {
        return { world: w, stageIdx: i, stage, reason: 'improve' };
      }
    }
  }
  return null;
}

/* Trouve un stage Drill recommandé (astuce déjà vue mais score moyen) */
function nextDrillToDo(profile) {
  // Cherche les drillKeys avec score 60-90% (zone d'automatisation à pousser)
  const candidates = Object.entries(profile.skills || {})
    .filter(([k, s]) => s.seen >= 8 && s.correct / s.seen >= 0.6 && s.correct / s.seen < 0.9)
    .sort((a, b) => (a[1].correct / a[1].seen) - (b[1].correct / b[1].seen));
  if (candidates.length === 0) return null;
  // Trouve un stage drill correspondant à ce drillKey
  for (const [drillKey] of candidates) {
    for (const w of WORLDS) {
      for (let i = 0; i < w.stages.length; i++) {
        const s = w.stages[i];
        if (s.drill) {
          // un drill ne pointe pas un drillKey unique, mais on peut juste recommander n'importe lequel du monde
          // si le drillKey est de ce monde, on prend ce drill
          const sameWorldStage = w.stages.find(x => x.drillKey === drillKey);
          if (sameWorldStage) return { world: w, stageIdx: i, stage: s };
        }
      }
    }
  }
  return null;
}

/* Coach : que faire MAINTENANT ? Renvoie une action prête à lancer.
   Priorité :
   1. Révisions urgentes (≥3 dues)
   2. Faiblesses (≥3 détectées)
   3. Drill ciblé sur une astuce moyenne
   4. Prochain stage du parcours
   5. Boss du monde si tout fini */
function whatNext(profile) {
  const due = dueSkills(profile);
  const weak = weakSkills(profile);
  const urgent = urgentSkills(profile);

  if (urgent.length >= 3 || (due.length >= 5)) {
    return { type: 'review', emoji: '🔁', label: 'Réviser tes astuces', hint: `${due.length} astuce${due.length>1?'s':''} à rafraîchir`, action: () => startExercise({ mode: 'review' }) };
  }
  if (weak.length >= 3) {
    return { type: 'weak', emoji: '🎯', label: 'Muscler tes faiblesses', hint: `${weak.length} point${weak.length>1?'s':''} à travailler`, action: () => startExercise({ mode: 'weak' }) };
  }
  if (due.length >= 1) {
    return { type: 'review', emoji: '🔁', label: 'Petite révision', hint: `${due.length} astuce${due.length>1?'s':''} à revoir`, action: () => startExercise({ mode: 'review' }) };
  }
  const drill = nextDrillToDo(profile);
  if (drill) {
    return { type: 'drill', emoji: '⚡', label: `Drill : ${drill.stage.name}`, hint: drill.world.name, action: () => startExercise({ world: drill.world, stageIdx: drill.stageIdx, mode: 'stage' }) };
  }
  const next = nextStageToDo(profile);
  if (next) {
    const hint = next.reason === 'new' ? `${next.world.name} · Nouveau` : `${next.world.name} · Améliorer (${profile.stages[`${next.world.id}_${next.stageIdx}`]?.stars||0}/3 ★)`;
    return { type: 'stage', emoji: next.world.emoji, label: next.stage.name, hint, action: () => startExercise({ world: next.world, stageIdx: next.stageIdx, mode: 'stage' }) };
  }
  // Tout fini → défi du jour ou boss aléatoire
  return { type: 'daily', emoji: '⚡', label: 'Défi du jour', hint: 'Tout est maîtrisé ! Continue à t\'entraîner.', action: () => startExercise({ mode: 'daily' }) };
}

/* Construit le plan du jour (3 activités) */
function buildDayPlan(profile) {
  const today = new Date().toISOString().slice(0, 10);
  // Si déjà construit aujourd'hui, on garde
  if (profile.dayPlanDate === today && profile.dayPlan) {
    return profile.dayPlan;
  }
  const plan = [];
  const due = dueSkills(profile);
  const weak = weakSkills(profile);

  // 1. Révision si dues
  if (due.length >= 1) {
    plan.push({ id: 'review', emoji: '🔁', title: 'Révision intelligente', subtitle: `${due.length} astuce${due.length>1?'s':''} à revoir`, mode: 'review' });
  }
  // 2. Faiblesses si détectées
  if (weak.length >= 1 && plan.length < 3) {
    plan.push({ id: 'weak', emoji: '🎯', title: 'Mes faiblesses', subtitle: `${weak.length} point${weak.length>1?'s':''} à muscler`, mode: 'weak' });
  }
  // 3. Prochain stage
  const next = nextStageToDo(profile);
  if (next && plan.length < 3) {
    plan.push({
      id: `stage_${next.world.id}_${next.stageIdx}`,
      emoji: next.world.emoji,
      title: next.stage.name,
      subtitle: next.world.name,
      mode: 'stage',
      worldId: next.world.id,
      stageIdx: next.stageIdx,
    });
  }
  // 4. Défi du jour comme bonus
  if (plan.length < 3) {
    plan.push({ id: 'daily', emoji: '⚡', title: 'Défi du jour', subtitle: '10 exos chronométrés', mode: 'daily' });
  }
  profile.dayPlan = plan;
  profile.dayPlanDate = today;
  profile.dayPlanDone = profile.dayPlanDone || {};
  // Reset des "fait aujourd'hui"
  if (profile.dayPlanDoneDate !== today) {
    profile.dayPlanDone = {};
    profile.dayPlanDoneDate = today;
  }
  saveData();
  return plan;
}

function markPlanDone(profile, planId) {
  profile.dayPlanDone = profile.dayPlanDone || {};
  profile.dayPlanDone[planId] = true;
  saveData();
}

/* Trouve un générateur par drillKey en parcourant tous les stages */
function genByDrillKey(drillKey) {
  for (const w of WORLDS) {
    for (const s of w.stages) {
      if (s.drillKey === drillKey) return { gen: s.gen, world: w.name, stage: s.name };
    }
  }
  return null;
}

/* Met à jour le streak quotidien (à appeler quand le profil joue) */
function tickDayStreak(profile) {
  const today = new Date().toISOString().slice(0, 10);
  if (profile.lastPlayDay === today) return; // déjà joué aujourd'hui
  if (!profile.lastPlayDay) {
    profile.dayStreak = 1;
  } else {
    const last = new Date(profile.lastPlayDay);
    const now = new Date(today);
    const diff = Math.round((now - last) / 86400000);
    if (diff === 1) profile.dayStreak++;       // hier → +1
    else profile.dayStreak = 1;                // gap → reset
  }
  profile.lastPlayDay = today;
  if (profile.dayStreak > profile.dayStreakBest) profile.dayStreakBest = profile.dayStreak;
}

function levelFor(xp) {
  // Niveaux : 100, 220, 360, 520, 700, 900, 1120, 1360, 1620, 1900...
  // Formule : XP cumulés = 100 * level + 10 * level * (level-1) (croissant)
  // Plus simple : le niveau N requiert 100 + (N-1)*20 xp pour ce niveau, cumul.
  let lvl = 1, cum = 0;
  while (true) {
    const need = 100 + (lvl - 1) * 20;
    if (cum + need > xp) return { level: lvl, into: xp - cum, need };
    cum += need;
    lvl++;
    if (lvl > 100) return { level: 100, into: 0, need: 1 };
  }
}

function addXP(profile, amount) {
  const before = levelFor(profile.xp).level;
  profile.xp += amount;
  const after = levelFor(profile.xp).level;
  return after - before; // niveaux gagnés
}

/* ---------- Trophées ---------- */
function award(profile, trophyId) {
  if (profile.trophies[trophyId]) return false;
  profile.trophies[trophyId] = Date.now();
  return true;
}

function checkTrophies(profile, ctx = {}) {
  const earned = [];
  // First blood
  if (!profile.trophies.first_blood) {
    profile.trophies.first_blood = Date.now();
    earned.push('first_blood');
  }
  const lvl = levelFor(profile.xp).level;
  if (lvl >= 10 && award(profile, 'lvl_10')) earned.push('lvl_10');
  if (lvl >= 25 && award(profile, 'lvl_25')) earned.push('lvl_25');
  if (lvl >= 50 && award(profile, 'lvl_50')) earned.push('lvl_50');
  if (profile.streakBest >= 10 && award(profile, 'streak_10')) earned.push('streak_10');
  if (profile.streakBest >= 20 && award(profile, 'streak_20')) earned.push('streak_20');
  if (profile.survivalBest >= 10 && award(profile, 'survivor_10')) earned.push('survivor_10');
  if (profile.survivalBest >= 25 && award(profile, 'survivor_25')) earned.push('survivor_25');
  if (profile.dailyDone >= 5 && award(profile, 'daily_5')) earned.push('daily_5');
  if (ctx.perfect && award(profile, 'perfect')) earned.push('perfect');
  if (ctx.chronoScore >= 10 && award(profile, 'chrono_10')) earned.push('chrono_10');
  if (ctx.chronoScore >= 20 && award(profile, 'chrono_20')) earned.push('chrono_20');
  if (ctx.chronoScore >= 30 && award(profile, 'chrono_30')) earned.push('chrono_30');
  const masteredCount = Object.values(profile.stages).filter(s => s.stars >= 3).length;
  if (masteredCount >= 5 && award(profile, 'master_5')) earned.push('master_5');
  if (masteredCount >= 15 && award(profile, 'master_15')) earned.push('master_15');
  if (masteredCount >= 30 && award(profile, 'master_30')) earned.push('master_30');
  // Streak quotidien
  if ((profile.dayStreakBest||profile.dayStreak||0) >= 3 && award(profile, 'streak_day_3')) earned.push('streak_day_3');
  if ((profile.dayStreakBest||profile.dayStreak||0) >= 7 && award(profile, 'streak_day_7')) earned.push('streak_day_7');
  if ((profile.dayStreakBest||profile.dayStreak||0) >= 30 && award(profile, 'streak_day_30')) earned.push('streak_day_30');
  if ((profile.dayStreakBest||profile.dayStreak||0) >= 100 && award(profile, 'streak_day_100')) earned.push('streak_day_100');
  // Heures rigolotes
  const h = new Date().getHours();
  if (h >= 21 && award(profile, 'night_owl')) earned.push('night_owl');
  if (h < 8 && award(profile, 'early_bird')) earned.push('early_bird');
  // Tir rapide
  if ((profile.fastAnswers||0) >= 5 && award(profile, 'rapid_fire')) earned.push('rapid_fire');
  // Phénix (déclenché ailleurs)
  if (ctx.comeback && award(profile, 'comeback')) earned.push('comeback');
  // Gros Coup (XP en une session)
  if (ctx.sessionXP >= 100 && award(profile, 'big_score')) earned.push('big_score');
  // Globetrotteur
  if ((profile.visitedWorlds||[]).length >= WORLDS.length && award(profile, 'globetrotter')) earned.push('globetrotter');
  // Mondes terminés
  WORLDS.forEach((w, idx) => {
    const allDone = w.stages.every((_, si) => {
      const k = `${w.id}_${si}`;
      return profile.stages[k] && profile.stages[k].completed;
    });
    if (allDone && award(profile, `world${idx+1}_done`)) earned.push(`world${idx+1}_done`);
  });
  // Toutes les leçons
  if (profile.lessonsRead.length >= WORLDS.length && award(profile, 'all_lessons')) {
    earned.push('all_lessons');
  }
  return earned;
}

/* ---------- Audio (Web Audio API, sons générés) ---------- */
let audioCtx = null;
function tone(freq, duration = 0.12, type = 'sine', vol = 0.15) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    o.start();
    o.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}
function sndGood() { tone(660, 0.1, 'sine'); setTimeout(()=>tone(880, 0.13, 'sine'), 80); }
function sndBad()  { tone(220, 0.18, 'square', 0.12); setTimeout(()=>tone(160, 0.2, 'square', 0.1), 100); }
function sndStreak(){ tone(800, 0.06); setTimeout(()=>tone(1000, 0.06), 50); setTimeout(()=>tone(1200, 0.1), 100); }
function sndLevel() { [600,800,1000,1200].forEach((f,i)=>setTimeout(()=>tone(f, 0.12, 'triangle'), i*70)); }

/* ---------- Vibration tactile (Vibration API)
   IMPORTANT : navigator.vibrate peut être synchrone et bloquer 30-80ms
   sur certains Android. On le différe TOUJOURS via requestIdleCallback
   ou setTimeout pour ne PAS bloquer la saisie clavier (vitesse > tactile). */
const _hasIdle = typeof requestIdleCallback === 'function';
function buzz(pattern) {
  const trigger = () => {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(e) {}
  };
  if (_hasIdle) requestIdleCallback(trigger, { timeout: 50 });
  else setTimeout(trigger, 0);
}
function buzzTap()    { buzz(5); }   // raccourci à 5ms (à peine perceptible mais ressenti)
function buzzGood()   { buzz(20); }
function buzzBad()    { buzz([60, 40, 60]); }
function buzzCombo()  { buzz([15, 30, 15, 30, 15]); }
function buzzLevel()  { buzz([30, 50, 30, 50, 60]); }
function buzzTrophy() { buzz([20, 40, 20, 40, 20, 40, 80]); }

/* Pré-réveil de l'AudioContext au premier tap (iOS exige interaction) */
let audioInitialized = false;
function initAudioOnce() {
  if (audioInitialized) return;
  audioInitialized = true;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // ping silencieux
    tone(440, 0.001, 'sine', 0.001);
  } catch(e) {}
}
document.addEventListener('touchstart', initAudioOnce, { once: true, passive: true });
document.addEventListener('click', initAudioOnce, { once: true });

/* ---------- Barre "zone d'astuce" ---------- */
let trickZoneTimer = null;
function startTrickZone(drillKey) {
  const zone = document.getElementById('trickZone');
  const bar = document.getElementById('trickZoneBar');
  const mF = document.getElementById('trickZoneMarkerFast');
  const mO = document.getElementById('trickZoneMarkerOk');
  if (!zone || !bar) return;
  if (trickZoneTimer) cancelAnimationFrame(trickZoneTimer);

  const t = thresholdFor(drillKey);
  // L'échelle visuelle = 1.5 × ok pour laisser voir la zone rouge
  const maxSec = t.ok * 1.5;
  // Place les marqueurs aux frontières
  if (mF) mF.style.left = (t.fast / maxSec * 100) + '%';
  if (mO) mO.style.left = (t.ok / maxSec * 100) + '%';
  zone.style.display = 'block';
  bar.style.width = '0%';

  const start = Date.now();
  function tick() {
    const elapsed = (Date.now() - start) / 1000;
    const pct = Math.min(100, elapsed / maxSec * 100);
    bar.style.width = pct + '%';
    if (pct < 100) trickZoneTimer = requestAnimationFrame(tick);
  }
  trickZoneTimer = requestAnimationFrame(tick);
}
function stopTrickZone() {
  if (trickZoneTimer) cancelAnimationFrame(trickZoneTimer);
  trickZoneTimer = null;
}

/* ---------- Effets visuels fun ---------- */
function comboFlash(text) {
  const el = document.createElement('div');
  el.className = 'combo-flash';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function xpPopup(amount, x, y) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = `+${amount} XP`;
  el.style.left = (x ?? window.innerWidth/2) + 'px';
  el.style.top = (y ?? window.innerHeight/2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function trophyToast(trophy) {
  const el = document.createElement('div');
  el.className = 'trophy-toast';
  el.innerHTML = `<div class="te">${trophy.emoji}</div><div><div class="tt">Trophée débloqué !</div><div class="tn">${escapeHTML(trophy.name)}</div></div>`;
  document.body.appendChild(el);
  buzzTrophy();
  [800, 1000, 1200, 1500].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'triangle', 0.18), i * 80));
  setTimeout(() => el.remove(), 3100);
}

function showLevelUp(profile, newLevel) {
  const overlay = document.getElementById('levelupOverlay');
  if (!overlay) return;
  const rank = rankFor(newLevel);
  document.getElementById('luNum').textContent = newLevel;
  document.getElementById('luRankEmoji').textContent = rank.emoji;
  document.getElementById('luRankName').textContent = rank.name;
  document.getElementById('luRankName').style.color = rank.color;
  overlay.classList.add('show');
  buzzLevel();
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.2), i * 90));
  confetti(60);
  setTimeout(() => overlay.classList.remove('show'), 2800);
}

/* ---------- Confetti CSS ---------- */
function confetti(count = 30) {
  const colors = ['#ffd166','#ff6b9d','#06d6a0','#4cc9f0','#b794f4'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.5 + Math.random()*1.5) + 's';
    c.style.animationDelay = (Math.random()*0.4) + 's';
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    document.body.appendChild(c);
    setTimeout(()=> c.remove(), 3500);
  }
}

/* ---------- Navigation ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ============================================================
   ÉCRAN PROFILS
   ============================================================ */
function renderProfiles() {
  const list = document.getElementById('profilesList');
  list.innerHTML = '';
  if (state.data.profiles.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;color:var(--text-soft);';
    empty.innerHTML = '👋 Aucun joueur pour l\'instant.<br>Crée ton premier profil pour commencer !';
    list.appendChild(empty);
    return;
  }
  state.data.profiles.forEach(p => {
    const item = document.createElement('div');
    item.className = 'profile-item';
    const lvl = levelFor(p.xp).level;
    item.innerHTML = `
      <div class="av">${avatarHTML(p)}</div>
      <div class="info">
        <b>${escapeHTML(p.name)}</b>
        <span>${p.classe} · Niveau ${lvl} · ${p.xp} XP</span>
      </div>
      <button class="del" data-act="export" data-id="${p.id}" title="Sauvegarder">💾</button>
      <button class="del" data-act="reset" data-id="${p.id}" title="Recommencer à zéro" style="margin-left:6px">🔄</button>
      <button class="del" data-act="del" data-id="${p.id}" title="Supprimer" style="margin-left:6px">🗑</button>
    `;
    item.addEventListener('click', (e) => {
      const btn = e.target.closest('.del');
      if (btn) {
        if (btn.dataset.act === 'export') {
          openExportModal(p);
        } else if (btn.dataset.act === 'reset') {
          if (confirm(`Recommencer le profil de ${p.name} à zéro ?\n\n⚠️ Toute sa progression sera perdue. Le prénom, l'avatar et la classe sont conservés.\n\nPense à sauvegarder avant (bouton 💾) si tu veux pouvoir restaurer.`)) {
            const fresh = newProfile(p.name, p.avatar, p.classe);
            fresh.id = p.id;
            const idx = state.data.profiles.findIndex(x => x.id === p.id);
            if (idx >= 0) state.data.profiles[idx] = fresh;
            saveData();
            renderProfiles();
            flash(`${p.name} : tout remis à zéro !`);
          }
        } else if (btn.dataset.act === 'del') {
          if (confirm(`Supprimer le profil de ${p.name} ?\n\n⚠️ Pense à le sauvegarder avant (bouton 💾) si tu veux le récupérer plus tard.`)) {
            state.data.profiles = state.data.profiles.filter(x => x.id !== p.id);
            saveData();
            renderProfiles();
          }
        }
        return;
      }
      selectProfile(p.id);
    });
    list.appendChild(item);
  });
}

function selectProfile(id) {
  state.current = state.data.profiles.find(p => p.id === id);
  if (!state.current) return;
  state.data.lastProfile = id;
  saveData();
  applyTheme(state.current);
  showMap();
}

function escapeHTML(s) {
  return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================================================
   ÉCRAN CRÉATION PROFIL
   ============================================================ */
let _newProfileTmp = { avatar: AVATARS[0], classe: 'CM1' };

function renderNewProfile() {
  const av = document.getElementById('avatarPicker');
  av.innerHTML = '';
  AVATARS.forEach(a => {
    const b = document.createElement('button');
    b.textContent = a;
    if (a === _newProfileTmp.avatar) b.classList.add('sel');
    b.addEventListener('click', () => {
      _newProfileTmp.avatar = a;
      av.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
    av.appendChild(b);
  });
  document.querySelectorAll('#classPicker button').forEach(btn => {
    btn.classList.toggle('sel', btn.dataset.class === _newProfileTmp.classe);
    btn.onclick = () => {
      _newProfileTmp.classe = btn.dataset.class;
      document.querySelectorAll('#classPicker button').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    };
  });
  document.getElementById('newName').value = '';
}

/* ============================================================
   ÉCRAN CARTE DES MONDES
   ============================================================ */
function showMap() {
  showScreen('screen-map');
  const p = state.current;
  // mise à jour streak quotidien à l'arrivée sur la carte
  tickDayStreak(p);
  saveData();

  document.getElementById('playerAvatar').innerHTML = avatarHTML(p);
  const rank = rankFor(levelFor(p.xp).level);
  document.getElementById('playerName').innerHTML = `${escapeHTML(p.name)} <span class="rank-banner" style="color:${rank.color}">${rank.emoji} ${rank.name}</span>`;
  const lvl = levelFor(p.xp);
  document.getElementById('playerLevel').textContent = lvl.level;
  document.getElementById('xpFill').style.width = (lvl.into / lvl.need * 100) + '%';
  document.getElementById('xpText').textContent = `${lvl.into} / ${lvl.need} XP`;

  // Streak card
  const days = p.dayStreak || 0;
  const card = document.getElementById('dailyStreakCard');
  if (days >= 2) {
    card.classList.remove('cold');
    document.getElementById('streakDays').textContent = `${days} jour${days>1?'s':''} d'affilée !`;
    document.getElementById('streakSubtitle').textContent = days >= 7 ? 'Tu es une machine ! Reviens demain pour continuer.' : 'Reviens demain pour ne pas casser le combo !';
  } else if (days === 1) {
    card.classList.add('cold');
    document.getElementById('streakDays').textContent = `Premier jour ! 🌱`;
    document.getElementById('streakSubtitle').textContent = 'Reviens demain pour démarrer un combo !';
  } else {
    card.classList.add('cold');
    document.getElementById('streakDays').textContent = `Bienvenue !`;
    document.getElementById('streakSubtitle').textContent = 'Joue chaque jour pour monter en flèche.';
  }

  // Badges Révision / Faiblesses
  const due = dueSkills(p);
  const weak = weakSkills(p);
  const urgent = urgentSkills(p);
  const blocked = isReviewBlocked(p);
  const rb = document.getElementById('reviewBadge');
  if (rb) rb.innerHTML = due.length > 0
    ? `${due.length} astuce${due.length>1?'s':''} à revoir <span class="badge-dot">${due.length}</span>`
    : 'Tout est frais !';
  const wb = document.getElementById('weakBadge');
  if (wb) wb.innerHTML = weak.length > 0
    ? `${weak.length} point${weak.length>1?'s':''} faible${weak.length>1?'s':''} <span class="badge-dot">${weak.length}</span>`
    : 'Aucune faiblesse détectée';

  // Coach : bouton "Continuer" + plan du jour + verrouillage
  renderCoach(p, blocked, urgent);

  // Tournoi familial
  renderTournament(p);
}

function renderTournament(currentP) {
  const card = document.getElementById('tournamentCard');
  if (!card) return;
  if (state.data.profiles.length < 2) {
    card.style.display = 'none';
    return;
  }
  // Détection nouveau champion en début de semaine
  checkWeeklyChampion();

  card.style.display = '';
  document.getElementById('tournamentWeek').textContent = '7 derniers jours';

  const ranking = tournamentRanking();
  const list = document.getElementById('tournamentList');
  list.innerHTML = '';
  ranking.forEach((r, i) => {
    const medals = ['🥇', '🥈', '🥉'];
    const row = document.createElement('div');
    row.className = 'tournament-row' + (r.profile.id === currentP.id ? ' current' : '');
    row.innerHTML = `
      <div class="tr-rank">${medals[i] || (i+1+'.')}</div>
      <div class="tr-av">${r.profile.avatar}</div>
      <div class="tr-name">${escapeHTML(r.profile.name)}</div>
      <div class="tr-xp">${r.weekly} XP</div>
    `;
    list.appendChild(row);
  });

  // Champion de la semaine précédente
  const lastChampion = (state.data.weeklyChampions || [])[0];
  const lastEl = document.getElementById('tournamentLast');
  if (lastChampion) {
    lastEl.style.display = '';
    lastEl.innerHTML = `🏆 Champion de la semaine ${lastChampion.week} : <b>${escapeHTML(lastChampion.champion.name)}</b> (${lastChampion.champion.xp} XP)`;
  } else {
    lastEl.style.display = 'none';
  }
}

function renderCoach(p, blocked, urgent) {
  // Bloc rouge si verrouillé
  const block = document.getElementById('reviewBlock');
  const continueBtn = document.getElementById('btnContinue');
  const plan = document.getElementById('dayPlan');
  const modes = document.querySelector('.game-modes');
  const worlds = document.getElementById('worldsGrid');

  if (blocked) {
    block.style.display = '';
    document.getElementById('reviewBlockMsg').innerHTML = `Tu as <b>${urgent.length}</b> astuces qui s'effacent — il faut les rafraîchir pour qu'elles deviennent automatiques. <b>Pas de nouveau contenu</b> tant que ce n'est pas fait !`;
    continueBtn.style.display = 'none';
    plan.style.display = 'none';
    if (modes) modes.style.display = 'none';
    if (worlds) worlds.style.opacity = '0.4';
  } else {
    block.style.display = 'none';
    continueBtn.style.display = '';
    plan.style.display = '';
    if (modes) modes.style.display = '';
    if (worlds) worlds.style.opacity = '1';
  }

  // Bouton Continuer — si tout le plan est fait, on félicite, mais on permet quand même
  const dayPlanRef = p.dayPlan || [];
  const allPlanDone = dayPlanRef.length > 0 && dayPlanRef.every(it => p.dayPlanDone && p.dayPlanDone[it.id]);
  if (allPlanDone) {
    document.getElementById('continueIcon').textContent = '🌟';
    document.getElementById('continueAction').textContent = 'Plan du jour terminé !';
    document.getElementById('continueHint').textContent = 'Tu peux continuer librement ou revenir demain.';
    continueBtn.onclick = () => {
      const next = whatNext(p);
      next.action();
    };
  } else {
    const next = whatNext(p);
    document.getElementById('continueIcon').textContent = next.emoji;
    document.getElementById('continueAction').textContent = next.label;
    document.getElementById('continueHint').textContent = next.hint;
    continueBtn.onclick = () => next.action();
  }

  // Plan du jour
  const dayPlan = buildDayPlan(p);
  const list = document.getElementById('dayPlanList');
  list.innerHTML = '';
  let doneCount = 0;
  dayPlan.forEach((item, idx) => {
    const isDone = !!(p.dayPlanDone && p.dayPlanDone[item.id]);
    if (isDone) doneCount++;
    // L'item est verrouillé tant que les précédents ne sont pas faits (parcours guidé)
    const isLocked = !isDone && idx > 0 && !(p.dayPlanDone && p.dayPlanDone[dayPlan[idx-1].id]);

    const el = document.createElement('div');
    el.className = 'day-plan-item' + (isDone ? ' done' : '') + (isLocked ? ' locked' : '');
    el.innerHTML = `
      <div class="check">${isDone ? '✓' : item.emoji}</div>
      <div class="label"><b>${item.title}</b><span>${item.subtitle}</span></div>
      <div class="arrow">${isLocked ? '🔒' : '→'}</div>
    `;
    if (!isLocked && !isDone) {
      el.onclick = () => {
        if (item.mode === 'stage') {
          const w = WORLDS.find(x => x.id === item.worldId);
          if (w) startExercise({ world: w, stageIdx: item.stageIdx, mode: 'stage', _planId: item.id });
        } else {
          startExercise({ mode: item.mode, _planId: item.id });
        }
      };
    }
    list.appendChild(el);
  });
  const prog = document.getElementById('dayPlanProgress');
  prog.textContent = `${doneCount}/${dayPlan.length}`;
  if (doneCount >= dayPlan.length) prog.classList.add('complete');
  else prog.classList.remove('complete');

  // Bouton "Réviser" du bloc bloquant
  document.getElementById('btnDoReview').onclick = () => startExercise({ mode: 'review' });

  const grid = document.getElementById('worldsGrid');
  grid.innerHTML = '';
  WORLDS.forEach((w, idx) => {
    const card = document.createElement('div');
    card.className = 'world-card';
    // Verrou progressif : monde N déverrouillé si monde N-1 a au moins 1 niveau complété (ou le tout premier)
    const locked = idx > 0 && !hasAnyComplete(WORLDS[idx-1]);
    if (locked) card.classList.add('locked');
    const stars = totalStars(w);
    const maxStars = w.stages.length * 3;
    card.innerHTML = `
      <span class="we">${w.emoji}</span>
      <div class="wn">${w.name}</div>
      <div class="ws">${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, Math.min(5, maxStars - stars)))}<br><small style="color:var(--text-soft);font-size:10px;letter-spacing:0">${stars}/${maxStars}</small></div>
    `;
    if (!locked) card.addEventListener('click', () => showWorld(w));
    grid.appendChild(card);
  });
}

function hasAnyComplete(world) {
  return world.stages.some((_, i) => {
    const k = `${world.id}_${i}`;
    return state.current.stages[k] && state.current.stages[k].completed;
  });
}

function totalStars(world) {
  let total = 0;
  world.stages.forEach((_, i) => {
    const k = `${world.id}_${i}`;
    if (state.current.stages[k]) total += state.current.stages[k].stars || 0;
  });
  return total;
}

/* ============================================================
   ÉCRAN MONDE
   ============================================================ */
let currentWorld = null;
function showWorld(world) {
  currentWorld = world;
  document.getElementById('worldTitle').textContent = world.name;
  document.getElementById('worldEmoji').textContent = world.emoji;
  document.getElementById('worldDescription').textContent = world.description;
  const list = document.getElementById('stagesList');
  list.innerHTML = '';
  world.stages.forEach((stage, i) => {
    const k = `${world.id}_${i}`;
    const saved = state.current.stages[k];
    const stars = saved ? saved.stars : 0;
    const best = saved ? saved.best : 0;
    const locked = i > 0 && !state.current.stages[`${world.id}_${i-1}`];
    const mastered = stars >= 3;
    const chronoSaved = state.current.stages[`${world.id}_${i}_chrono`];
    const chronoBest = chronoSaved?.best || 0;

    const item = document.createElement('div');
    item.className = 'stage-item' + (locked ? ' locked' : '');
    item.innerHTML = `
      <div class="num">${i+1}</div>
      <div class="info">
        <b>${stage.name}${mastered ? '<span class="badge-master">MAÎTRISÉ</span>' : ''}</b>
        <span>${stage.desc}${best ? ' · Meilleur : ' + best + '/' + stage.count : ''}${chronoBest ? ' · ⏱️ ' + chronoBest : ''}</span>
      </div>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
      <div class="chrono-mini ${mastered ? '' : 'locked'}" title="${mastered ? 'Challenge Chrono' : 'Maîtrise ce niveau (3★) pour débloquer'}" data-stage="${i}">⏱️</div>
    `;
    if (!locked) {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.chrono-mini')) {
          if (mastered) startExercise({ world, stageIdx: i, mode: 'chrono' });
          else flash('Atteins 3★ pour débloquer le Chrono !');
          return;
        }
        startExercise({ world, stageIdx: i, mode: 'stage' });
      });
    }
    list.appendChild(item);
  });

  // Bouton "Challenge Chrono" global du monde si au moins 1 stage maîtrisé
  const anyMastered = world.stages.some((_, i) => {
    const k = `${world.id}_${i}`;
    return state.current.stages[k]?.stars >= 3;
  });
  document.getElementById('btnChallenge').style.display = anyMastered ? 'block' : 'none';

  showScreen('screen-world');
}

function flash(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#ffd166;padding:14px 22px;border-radius:14px;font-weight:700;font-size:14px;z-index:300;border:1px solid rgba(255,209,102,0.4);max-width:80%;text-align:center;animation:fadeIn 0.2s';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ============================================================
   LEÇON
   ============================================================ */
function showLesson(world) {
  document.getElementById('lessonContent').innerHTML = world.lesson;
  document.getElementById('btnLessonDone').onclick = () => {
    if (!state.current.lessonsRead.includes(world.id)) {
      state.current.lessonsRead.push(world.id);
      saveData();
    }
    showScreen('screen-world');
  };
  showScreen('screen-lesson');
}

/* ============================================================
   EXERCICE — moteur principal
   ============================================================ */

function startExercise(opts) {
  // Verrouillage strict : si trop de révisions urgentes, on FORCE la révision
  if (state.current && isReviewBlocked(state.current) && opts.mode !== 'review' && opts.mode !== 'weak') {
    flash('🔒 Révise d\'abord ! Tes astuces s\'effacent.');
    setTimeout(() => startExercise({ mode: 'review' }), 800);
    return;
  }
  const ses = {
    _planId: opts._planId || null,
    mode: opts.mode,
    world: opts.world,
    stageIdx: opts.stageIdx ?? null,
    count: 0,
    total: 10,
    correct: 0,
    streak: 0,
    streakMax: 0,
    lives: opts.mode === 'survival' ? 3 : null,
    timer: null,
    timeLimit: opts.mode === 'daily' ? 15 : (opts.mode === 'survival' ? 10 : null),
    timeLeft: 0,
    badges: [],
    recent: [],         // anti-répétition (dernières questions)
    currentEx: null,
    perfect: true,
  };

  if (opts.mode === 'stage') {
    const stage = opts.world.stages[opts.stageIdx];
    ses.total = stage.count;
    ses.gen = stage.gen;
    ses.drillKey = stage.drillKey || null;
    ses.title = `${opts.world.name} — ${stage.name}`;

    // Révision espacée : injection de 3 questions de révision en début de stage
    // (uniquement si stage non-drill et au moins 3 skills à réviser)
    if (!stage.drill && stage.count >= 10) {
      const due = dueSkills(state.current);
      if (due.length >= 3) {
        ses.reviewQueue = due.slice(0, 3).map(k => {
          const g = genByDrillKey(k);
          return g ? { drillKey: k, gen: g.gen, label: g.stage } : null;
        }).filter(Boolean);
      }
    }
  } else if (opts.mode === 'review') {
    // Mode Révision Espacée pure : pioche dans les compétences à réviser
    const due = dueSkills(state.current);
    if (due.length === 0) {
      // Si rien à réviser, pioche les skills les moins récentes
      const all = Object.entries(state.current.skills || {})
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
        .map(([k]) => k);
      due.push(...all.slice(0, 10));
    }
    ses.total = Math.min(15, Math.max(5, due.length));
    const queue = due.slice(0, ses.total).map(k => {
      const g = genByDrillKey(k);
      return g ? { drillKey: k, gen: g.gen } : null;
    }).filter(Boolean);
    let qi = 0;
    ses.gen = () => {
      const item = queue[qi % queue.length];
      qi++;
      const ex = item.gen();
      ex.drillKey = item.drillKey;
      return ex;
    };
    ses.title = '🔁 Révision Intelligente';
  } else if (opts.mode === 'weak') {
    // Mode Faiblesses : focus sur ce qu'il rate le plus
    const weak = weakSkills(state.current);
    if (weak.length === 0) {
      flash('Aucune faiblesse détectée — joue plus pour analyser !');
      state.session = null;
      showMap();
      return;
    }
    const queue = weak.slice(0, 5).map(k => {
      const g = genByDrillKey(k);
      return g ? { drillKey: k, gen: g.gen } : null;
    }).filter(Boolean);
    ses.total = 15;
    let qi = 0;
    ses.gen = () => {
      const item = queue[qi % queue.length];
      qi++;
      const ex = item.gen();
      ex.drillKey = item.drillKey;
      return ex;
    };
    ses.title = '🎯 Mes Faiblesses';
  } else if (opts.mode === 'chrono') {
    // Challenge chrono d'un stage maîtrisé : 60 secondes globales, on enchaîne
    const stage = opts.world.stages[opts.stageIdx];
    ses.total = Infinity;
    ses.gen = stage.gen;
    ses.title = `Chrono — ${stage.name}`;
    ses.globalChrono = 60; // secondes
    ses.globalChronoLeft = 60;
  } else if (opts.mode === 'worldchrono') {
    // Challenge chrono du monde entier : pioche dans tous les stages maîtrisés
    const masteredStages = opts.world.stages.filter((_, i) => {
      const k = `${opts.world.id}_${i}`;
      return state.current.stages[k]?.stars >= 3;
    });
    const gens = masteredStages.length ? masteredStages.map(s => s.gen) : opts.world.stages.map(s => s.gen);
    ses.total = Infinity;
    ses.gen = () => pick(gens)();
    ses.title = `Chrono ${opts.world.name}`;
    ses.globalChrono = 90;
    ses.globalChronoLeft = 90;
  } else if (opts.mode === 'boss') {
    // Boss en 2 phases : phase 1 = 20 exos chrono (vitesse), phase 2 = 10 exos longs/mix
    ses.total = 30;
    ses.bossPhase = 1;
    let bossCount = 0;
    const phase1Gens = opts.world.stages.filter(s => !s.drill).map(s => s.gen);
    ses.gen = () => {
      bossCount++;
      ses.bossPhase = bossCount <= 20 ? 1 : 2;
      if (bossCount <= 20) {
        // Phase 1 : vitesse — exos courts, mix du monde
        return pick(phase1Gens)();
      } else {
        // Phase 2 : calculs longs / mix complexe
        const longGen = opts.world.stages.find(s => s.name === 'Marathon')?.gen;
        if (longGen && Math.random() < 0.7) return longGen();
        return pick(phase1Gens)();
      }
    };
    ses.timeLimit = 12; // chrono par question phase 1
    ses.title = `👑 Boss — ${opts.world.name}`;
  } else if (opts.mode === 'daily') {
    ses.total = 10;
    ses.gen = () => GEN_DAILY(levelFor(state.current.xp).level);
    ses.title = 'Défi du jour';
  } else if (opts.mode === 'survival') {
    ses.total = Infinity;
    ses.gen = () => GEN_SURVIVAL(ses.correct);
    ses.title = 'Mode Survie';
  }

  ses.questionStartTime = 0;
  ses.startedAt = Date.now();
  // Compteurs par statut pour le score "astuces vraiment prises"
  ses.statusCount = { MASTERED: 0, CORRECT: 0, SLOW: 0, WRONG: 0 };
  ses.timesByDrill = {}; // { drillKey: [t1,t2,...] }
  state.session = ses;
  // Marque le monde comme visité (trophée Globetrotteur)
  if (opts.world) {
    state.current.visitedWorlds = state.current.visitedWorlds || [];
    if (!state.current.visitedWorlds.includes(opts.world.id)) {
      state.current.visitedWorlds.push(opts.world.id);
    }
  }
  // Reset compteur tir rapide pour cette session
  state.current.fastAnswers = 0;
  state.current.consecutiveErrors = 0;
  state.current.sessionXP = 0;

  showScreen('screen-exercise');
  document.getElementById('feedback').classList.remove('show');
  nextQuestion();
}

function nextQuestion() {
  const s = state.session;
  if (!s || s._finished) return;

  // Fin de session ?
  if (s.count >= s.total && s.mode !== 'survival' && s.mode !== 'chrono' && s.mode !== 'worldchrono') {
    finishSession();
    return;
  }
  // Chrono global : on s'arrête si le temps est écoulé
  if ((s.mode === 'chrono' || s.mode === 'worldchrono') && s.globalChronoLeft <= 0) {
    finishSession();
    return;
  }
  // Garde-fou : si on dépasse le total de plus de 1 (cas pathologique), on stoppe
  if (typeof s.total === 'number' && isFinite(s.total) && s.count > s.total) {
    console.warn('Session count exceeds total — forcing finish');
    finishSession();
    return;
  }

  // Si mode boss, ajuste le timeLimit selon la phase
  if (s.mode === 'boss') {
    s.timeLimit = s.bossPhase === 1 ? 12 : null; // phase 2 : pas de chrono (calculs longs)
  }

  // Génère une question : d'abord vide la file de révision (3 premiers), sinon générateur normal
  let ex, attempts = 0;
  if (s.reviewQueue && s.reviewQueue.length > 0) {
    const item = s.reviewQueue.shift();
    do {
      ex = item.gen();
      attempts++;
    } while (s.recent.includes(ex.question) && attempts < 5);
    ex.drillKey = item.drillKey;
    ex.isReview = true;
    ex.reviewLabel = item.label;
  } else {
    do {
      ex = s.gen();
      attempts++;
    } while (s.recent.includes(ex.question) && attempts < 8);
    if (s.drillKey && !ex.drillKey) ex.drillKey = s.drillKey;
  }
  s.recent.push(ex.question);
  if (s.recent.length > 8) s.recent.shift();
  s.currentEx = ex;
  s.count++;
  s.questionStartTime = Date.now();
  s.firstKeyTime = null; // se remplit au 1er tap → mesure la réflexion pure
  // Démarre la barre "zone d'astuce" pour cet exo
  startTrickZone(ex.drillKey || s.drillKey);

  // UI
  const trickText = ex.isReview ? `🔁 RÉVISION · ${ex.trick}` : (s.mode === 'boss' && s.bossPhase === 2 ? `👑 PHASE 2 · ${ex.trick}` : ex.trick);
  document.getElementById('exTrick').textContent = trickText;
  document.getElementById('exQuestion').innerHTML = formatQuestion(ex.question);
  // Touche "/" pour les fractions
  const fracKey = document.getElementById('exKeyFrac');
  if (fracKey) fracKey.style.display = ex.isFraction ? '' : 'none';
  const ans = document.getElementById('exAnswer');
  if (ans) ans.placeholder = ex.isFraction ? 'ex: 3/4 ou 7' : '?';
  document.getElementById('exAnswer').value = '';
  let counter;
  if (s.mode === 'survival') counter = `Survie : ${s.correct} ✓`;
  else if (s.mode === 'chrono' || s.mode === 'worldchrono') counter = `Chrono ⏱️ ${s.globalChronoLeft}s · ${s.correct} ✓`;
  else counter = `${s.count} / ${s.total}`;
  document.getElementById('exCounter').textContent = counter;
  let pct;
  if (s.mode === 'survival') pct = Math.min(100, s.correct * 4);
  else if (s.mode === 'chrono' || s.mode === 'worldchrono') pct = (1 - s.globalChronoLeft / s.globalChrono) * 100;
  else pct = (s.count / s.total * 100);
  document.getElementById('exProgressFill').style.width = pct + '%';
  document.getElementById('exStreak').textContent = `🔥 ${s.streak}`;
  if (s.lives !== null) {
    document.getElementById('exLives').textContent = '❤️'.repeat(s.lives);
    document.getElementById('exLives').style.display = '';
  } else {
    document.getElementById('exLives').style.display = 'none';
  }

  // Timer par question
  if (s.timeLimit) {
    s.timeLeft = s.timeLimit;
    const wrap = document.getElementById('exTimerWrap');
    const bar = document.getElementById('exTimerBar');
    wrap.classList.add('show');
    bar.style.width = '100%';
    bar.style.transition = 'none';
    requestAnimationFrame(() => {
      bar.style.transition = `width ${s.timeLimit}s linear`;
      bar.style.width = '0%';
    });
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      submitAnswer(true);
    }, s.timeLimit * 1000);
  } else {
    document.getElementById('exTimerWrap').classList.remove('show');
  }

  // Timer GLOBAL pour mode chrono
  if (s.mode === 'chrono' || s.mode === 'worldchrono') {
    if (s.globalTimer) clearInterval(s.globalTimer);
    const wrap = document.getElementById('exTimerWrap');
    const bar = document.getElementById('exTimerBar');
    wrap.classList.add('show');
    const updateBar = () => {
      bar.style.transition = 'none';
      bar.style.width = (s.globalChronoLeft / s.globalChrono * 100) + '%';
    };
    updateBar();
    s.globalTimer = setInterval(() => {
      s.globalChronoLeft--;
      updateBar();
      const cnt = `Chrono ⏱️ ${s.globalChronoLeft}s · ${s.correct} ✓`;
      document.getElementById('exCounter').textContent = cnt;
      document.getElementById('exProgressFill').style.width = ((1 - s.globalChronoLeft / s.globalChrono) * 100) + '%';
      if (s.globalChronoLeft <= 0) {
        clearInterval(s.globalTimer);
        s.globalTimer = null;
        if (s.timer) { clearTimeout(s.timer); s.timer = null; }
        finishSession();
      }
    }, 1000);
  }
}

function formatQuestion(q) {
  // 1. Si la chaîne contient déjà du HTML (double appel), on n'y retouche pas
  if (typeof q !== 'string') q = String(q);
  if (q.indexOf('<span') !== -1) return q;
  // 2. Échappe d'abord les caractères HTML pour éviter toute interprétation parasite
  let s = q.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  // 3. Remplace les opérateurs par des marqueurs intermédiaires (insensibles à toute ré-évaluation)
  s = s.replace(/×/g, 'MUL');
  s = s.replace(/÷/g, 'DIV');
  s = s.replace(/\+/g, 'ADD');
  s = s.replace(/−/g, 'SUB');
  s = s.replace(/=/g, 'EQ');
  // 4. Construit le HTML final
  s = s.replace(/MUL/g, '<span class="op">×</span>');
  s = s.replace(/DIV/g, '<span class="op">÷</span>');
  s = s.replace(/ADD/g, '<span class="op">+</span>');
  s = s.replace(/SUB/g, '<span class="op">−</span>');
  s = s.replace(/EQ/g, '<span class="op">=</span>');
  return s;
}

function submitAnswer(timeout = false) {
  const s = state.session;
  if (!s || !s.currentEx) return;
  if (s._submitting) return; // empêche la double soumission (clic + entrée)
  s._submitting = true;
  if (s.timer) { clearTimeout(s.timer); s.timer = null; }

  const userInput = document.getElementById('exAnswer').value;
  const ex = s.currentEx;
  // Si l'exo attend une fraction, on tolère les 2 formats (a/b OU décimal équivalent)
  let isGood;
  if (ex.isFraction && ex.answerFrac) {
    isGood = !timeout && fracEquals(userInput, ex.answerFrac[0], ex.answerFrac[1]);
  } else {
    isGood = !timeout && answerEquals(userInput, ex.answer);
  }

  // Le temps qui mesure l'ASTUCE = temps de réflexion (jusqu'au 1er tap)
  // + un coût plat de saisie (0.5s pour valider).
  // Si pas de 1er tap (l'enfant a tapé au clavier physique sans utiliser le keypad,
  // ou réponse à 1 chiffre validée direct), on retombe sur le temps total.
  const totalElapsed = (Date.now() - s.questionStartTime) / 1000;
  let elapsed;
  if (s.firstKeyTime) {
    const reflectionTime = (s.firstKeyTime - s.questionStartTime) / 1000;
    elapsed = reflectionTime + 0.5; // coût uniforme de saisie
  } else {
    elapsed = totalElapsed;
  }
  stopTrickZone();

  // Évaluation 4 niveaux (justesse + vitesse)
  const evalResult = evaluateAnswer(isGood, elapsed, ex.drillKey);
  s.statusCount[evalResult.status] = (s.statusCount[evalResult.status] || 0) + 1;
  if (ex.drillKey) {
    s.timesByDrill[ex.drillKey] = s.timesByDrill[ex.drillKey] || [];
    s.timesByDrill[ex.drillKey].push(elapsed);
  }

  // Enregistre la skill pour la révision espacée + suivi des faiblesses
  // ATTENTION : "MASTERED" → bonne avec astuce → on monte fort.
  //             "CORRECT" → bon mais lent → on traite comme à demi-acquis (pas de montée Leitner).
  //             "SLOW" → bon mais brut → traité comme une erreur côté Leitner (à reprendre).
  //             "WRONG" → faux → idem erreur classique.
  if (ex.drillKey) recordSkillStatus(state.current, ex.drillKey, evalResult.status, elapsed);

  // Stocke l'évaluation pour le feedback
  s.lastEval = evalResult;
  s.lastElapsed = elapsed;

  if (isGood) {
    s.correct++;
    s.streak++;
    s.streakMax = Math.max(s.streakMax, s.streak);
    // Son différencié selon que c'est un vrai réflexe ou pas
    if (evalResult.status === 'MASTERED') {
      sndGood();
      tone(1320, 0.08, 'sine', 0.12); // ping cristallin bonus pour réflexe
    } else {
      sndGood();
    }
    buzzGood();

    // Fast answer (< 3s) → trophée Tir Rapide
    if (elapsed < 3) {
      state.current.fastAnswers = (state.current.fastAnswers || 0) + 1;
    }

    // Phénix : si 2+ erreurs récentes puis bonne, déclenche le trophée
    if (state.current.consecutiveErrors >= 2) {
      const newT = checkTrophies(state.current, { comeback: true });
      newT.forEach(t => {
        const tr = TROPHIES.find(x => x.id === t);
        if (tr) trophyToast(tr);
      });
    }
    state.current.consecutiveErrors = 0;

    // Combo flash spectaculaire à certains paliers
    if (STREAK_PHRASES[s.streak]) {
      comboFlash(pick(STREAK_PHRASES[s.streak]));
      sndStreak();
      buzzCombo();
    }
    // Streak chaud sur la barre
    if (s.streak >= 3) {
      const el = document.getElementById('exStreak');
      el.classList.add('hot');
      setTimeout(() => el.classList.remove('hot'), 600);
    }
    if (s.streak >= 5) confetti(Math.min(40, 10 + s.streak));

    showFeedback(true, ex, userInput);
  } else {
    s.streak = 0;
    s.perfect = false;
    state.current.consecutiveErrors = (state.current.consecutiveErrors || 0) + 1;
    if (s.lives !== null) s.lives--;
    sndBad();
    buzzBad();
    document.getElementById('exerciseCard').classList.add('shake');
    setTimeout(()=> document.getElementById('exerciseCard').classList.remove('shake'), 400);
    showFeedback(false, ex, userInput, timeout);
  }
}

function showFeedback(good, ex, userInput, timeout = false) {
  const s = state.session;
  const fb = document.getElementById('feedback');
  const card = document.getElementById('feedbackCard');
  card.classList.toggle('good', good);
  card.classList.toggle('bad', !good);

  const isChrono = s && (s.mode === 'chrono' || s.mode === 'worldchrono');
  const evalR = s && s.lastEval;
  const elapsed = s && s.lastElapsed;

  // Marque qu'on est en train d'expliquer une erreur (pour le retry)
  if (s) s._wasWrong = !good;

  // Icône + titre selon le STATUT (pas juste juste/faux)
  let icon, title;
  if (!good) {
    icon = timeout ? '⏰' : '😅';
    if (s && s._inRetry) {
      title = 'Pas grave, on l\'a tous fait. Lis bien la méthode :';
    } else {
      title = timeout ? 'Temps écoulé !' : pick(COMFORT_PHRASES.slice(0, 2).concat(['Pas grave !']));
    }
  } else if (evalR && evalR.status === 'MASTERED') {
    icon = pick(['💎', '⚡', '🔥', '✨']);
    title = s.streak >= 3 ? pick(HYPE_PHRASES) : pick(['Réflexe parfait !', 'Astuce maîtrisée !', 'C\'est ça !', 'Boom !']);
  } else if (evalR && evalR.status === 'CORRECT') {
    icon = '✅';
    title = 'Bon ! Tu peux aller plus vite.';
  } else if (s && s._inRetry && evalR && (evalR.status === 'MASTERED' || evalR.status === 'CORRECT')) {
    icon = '🎯';
    title = 'Voilà, c\'est ça ! Bien retenu.';
  } else if (evalR && evalR.status === 'SLOW') {
    icon = '👍';
    title = 'Bonne réponse ! Et si on essayait le raccourci ?';
  } else {
    icon = pick(['🎉', '⭐']);
    title = 'Bien joué !';
  }
  document.getElementById('feedbackIcon').textContent = icon;
  document.getElementById('feedbackTitle').textContent = title;

  // Affichage de l'équation + chrono mesuré
  const timeBadge = (good && elapsed != null && evalR)
    ? `<div class="time-badge time-${evalR.status.toLowerCase()}"><b>${evalR.emoji} ${elapsed.toFixed(1)}s</b><span>${evalR.label}</span></div>`
    : '';
  const displayedAnswer = (ex.isFraction && ex.answerFrac)
    ? fmtFrac(ex.answerFrac[0], ex.answerFrac[1])
    : fmt(ex.answer);
  const eq = good
    ? `${timeBadge}${formatQuestion(ex.question)} = <span class="res">${displayedAnswer}</span>`
    : `${formatQuestion(ex.question)} = <span class="res">${displayedAnswer}</span>${userInput && !timeout ? `<br><small style="color:var(--bad);font-weight:400">Ta réponse : ${escapeHTML(userInput)}</small>` : ''}`;
  document.getElementById('feedbackEq').innerHTML = eq;

  // Explication TOUJOURS — sauf en chrono où on file ET on a fait MASTERED
  // (Si CORRECT/SLOW : on AFFICHE l'explication même en chrono, pour forcer l'apprentissage)
  const skipExpl = isChrono && good && evalR && evalR.status === 'MASTERED';
  if (skipExpl) {
    document.getElementById('feedbackExpl').innerHTML = '';
    document.getElementById('feedbackExpl').style.display = 'none';
  } else {
    document.getElementById('feedbackExpl').style.display = '';
    let coachLine = '';
    if (good && evalR && evalR.status === 'CORRECT') {
      coachLine = `<div class="coach-tip">⚡ Bien joué ! Avec un peu de pratique, tu peux appliquer <b>${evalR.threshold.label}</b> encore plus naturellement. Relis la méthode :</div>`;
    } else if (good && evalR && evalR.status === 'SLOW') {
      coachLine = `<div class="coach-tip slow">🐢 Tu as trouvé, mais on dirait que tu n'as pas pris le raccourci. <b>${evalR.threshold.label}</b> rend ce calcul beaucoup plus simple — viens voir comment :</div>`;
    } else if (good && evalR && evalR.status === 'MASTERED') {
      coachLine = `<div class="coach-tip mastered">💎 Tu utilises bien l'astuce <b>${evalR.threshold.label}</b> — continue !</div>`;
    }
    document.getElementById('feedbackExpl').innerHTML = coachLine + ex.explanation;
  }

  // Bouton "Suivant" : configuration selon le contexte
  const btnNext = document.getElementById('btnNext');
  // Reset visuel (anti-état figé d'une session précédente)
  btnNext.style.display = '';
  btnNext.disabled = false;
  btnNext.classList.remove('countdown');
  btnNext.style.opacity = '';

  // En chrono ET bonne réponse : auto-avance après 800ms (pas d'apprentissage forcé)
  if (isChrono && good) {
    fb.classList.add('show');
    btnNext.style.display = 'none';
    setTimeout(() => {
      btnNext.style.display = '';
      const cur = state.session;
      if (cur && !cur._finished && fb.classList.contains('show')) nextAfterFeedback();
    }, 800);
    return;
  }

  // ERREUR : on FORCE l'attention sur l'explication (apprentissage prioritaire)
  if (!good) {
    btnNext.textContent = "J'ai compris →";
    // Délai obligatoire de 4 secondes : l'œil tombe sur l'explication
    btnNext.disabled = true;
    btnNext.classList.add('countdown');
    let secondsLeft = 4;
    btnNext.dataset.countdown = secondsLeft;
    btnNext.style.opacity = '0.5';
    const tick = () => {
      secondsLeft--;
      btnNext.dataset.countdown = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(s._countdownTimer);
        s._countdownTimer = null;
        btnNext.disabled = false;
        btnNext.classList.remove('countdown');
        btnNext.style.opacity = '';
        delete btnNext.dataset.countdown;
        btnNext.textContent = "J'ai compris →";
      }
    };
    if (s._countdownTimer) clearInterval(s._countdownTimer);
    s._countdownTimer = setInterval(tick, 1000);
  } else {
    // Bonne réponse classique : bouton normal disponible immédiatement
    btnNext.textContent = "Suivant →";
  }
  fb.classList.add('show');
}

function nextAfterFeedback() {
  document.getElementById('feedback').classList.remove('show');
  const s = state.session;
  if (!s || s._finished) return;
  // Stoppe le countdown s'il tourne encore
  if (s._countdownTimer) { clearInterval(s._countdownTimer); s._countdownTimer = null; }
  // Libère le verrou de soumission pour la prochaine question
  s._submitting = false;
  // Mode survie : si 0 vie, fin
  if (s.mode === 'survival' && s.lives <= 0) {
    finishSession();
    return;
  }
  // RETRY après erreur : on REJOUE le même calcul une fois pour valider
  // que l'enfant a vraiment compris l'astuce. Sauf en mode chrono (vitesse) où
  // on ne peut pas perdre du temps, et sauf si on est déjà en retry.
  const isChrono = s.mode === 'chrono' || s.mode === 'worldchrono';
  if (s._wasWrong && !s._inRetry && !isChrono) {
    s._inRetry = true;
    s._wasWrong = false;
    retryCurrentQuestion();
    return;
  }
  // Sinon on avance vraiment
  s._inRetry = false;
  s._wasWrong = false;
  nextQuestion();
}

/* Réaffiche le MÊME exo (pas de count++) pour forcer la maîtrise */
function retryCurrentQuestion() {
  const s = state.session;
  if (!s || !s.currentEx) return;
  const ex = s.currentEx;
  // UI : on rebascule sur l'écran d'exercice (déjà dessus normalement)
  document.getElementById('exTrick').textContent = '🔁 Reprenons : applique la méthode';
  document.getElementById('exQuestion').innerHTML = formatQuestion(ex.question);
  document.getElementById('exAnswer').value = '';
  // Reset compteur visuel timing pour ce retry
  s.questionStartTime = Date.now();
  s.firstKeyTime = null;
  startTrickZone(ex.drillKey || s.drillKey);
  // Touche fraction
  const fracKey = document.getElementById('exKeyFrac');
  if (fracKey) fracKey.style.display = ex.isFraction ? '' : 'none';
}

function finishSession() {
  const s = state.session;
  if (!s || s._finished) return;
  s._finished = true; // empêche les doubles appels
  if (s.timer) { clearTimeout(s.timer); s.timer = null; }
  if (s.globalTimer) { clearInterval(s.globalTimer); s.globalTimer = null; }
  document.getElementById('feedback').classList.remove('show');

  const p = state.current;

  // Score / XP / étoiles
  let score, total, xpGain = 0, stars = 0;
  if (s.mode === 'survival') {
    score = s.correct;
    total = s.correct;
    xpGain = s.correct * 5;
    if (s.correct > p.survivalBest) p.survivalBest = s.correct;
  } else if (s.mode === 'chrono' || s.mode === 'worldchrono') {
    score = s.correct;
    total = s.correct;
    xpGain = s.correct * 8;
    if (s.streakMax >= 5) xpGain += 20;
  } else if (s.mode === 'review' || s.mode === 'weak') {
    score = s.correct;
    total = s.total;
    xpGain = Math.round(score * 12);
    if (s.streakMax >= 5) xpGain += 20;
  } else {
    score = s.correct;
    total = s.total;
    const ratio = score / total;
    const mastered = s.statusCount.MASTERED || 0;
    const masteredRatio = mastered / total;
    // Bonus XP en fonction des MASTERED (réflexes astuce) — c'est ça qu'on récompense
    xpGain = Math.round(score * 8 + mastered * 4);
    xpGain = Math.round(xpGain * (s.mode === 'boss' ? 1.5 : s.mode === 'daily' ? 1.3 : 1));
    if (s.streakMax >= 5) xpGain += 20;
    // ÉTOILES selon ASTUCE PRISE, pas seulement justesse :
    //   3★ : 100% bons ET ≥ 70% en réflexe (astuce intégrée)
    //   2★ : ≥ 80% bons ET ≥ 40% en réflexe (bon mais à automatiser)
    //   1★ : ≥ 50% bons (ou tout bon mais lent — il faut retravailler la méthode)
    if (ratio === 1 && masteredRatio >= 0.7) stars = 3;
    else if (ratio >= 0.8 && masteredRatio >= 0.4) stars = 2;
    else if (ratio >= 0.5) stars = 1;
    else stars = 0;
  }

  // Streak global
  if (s.streakMax > p.streakBest) p.streakBest = s.streakMax;

  // Sauvegarde stage
  if (s.mode === 'stage') {
    const k = `${s.world.id}_${s.stageIdx}`;
    const prev = p.stages[k] || { stars: 0, best: 0, completed: false };
    p.stages[k] = {
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, score),
      completed: prev.completed || score >= total * 0.5,
    };
  } else if (s.mode === 'boss') {
    const k = `${s.world.id}_boss`;
    const prev = p.stages[k] || { stars: 0, best: 0, completed: false };
    p.stages[k] = {
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, score),
      completed: true,
    };
  } else if (s.mode === 'chrono') {
    const k = `${s.world.id}_${s.stageIdx}_chrono`;
    const prev = p.stages[k] || { best: 0 };
    p.stages[k] = { best: Math.max(prev.best, score) };
  } else if (s.mode === 'worldchrono') {
    const k = `${s.world.id}_worldchrono`;
    const prev = p.stages[k] || { best: 0 };
    p.stages[k] = { best: Math.max(prev.best, score) };
  } else if (s.mode === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    if (p.dailyDate !== today) {
      p.dailyDone = (p.dailyDone || 0) + 1;
      p.dailyDate = today;
    }
  }

  p.sessionXP = (p.sessionXP || 0) + xpGain;
  // Activité (pour heatmap et wrapped)
  const sessionSeconds = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
  recordActivity(p, (s.correct + (s.total === Infinity ? 0 : Math.max(0, s.count - s.correct))), s.correct, xpGain, sessionSeconds);
  // Astuce favorite : la plus utilisée récemment
  if (s.world) p.favTrick = s.world.name;

  const lvlBefore = levelFor(p.xp).level;
  const lvlGain = addXP(p, xpGain);
  const lvlAfter = levelFor(p.xp).level;

  // Marque l'item du plan du jour comme fait
  if (s._planId) markPlanDone(p, s._planId);
  // Et déduction par mode si _planId pas fourni mais qu'on a fait l'activité du plan
  if (!s._planId && p.dayPlan) {
    if (s.mode === 'review') markPlanDone(p, 'review');
    else if (s.mode === 'weak') markPlanDone(p, 'weak');
    else if (s.mode === 'daily') markPlanDone(p, 'daily');
    else if (s.mode === 'stage' && s.world) {
      markPlanDone(p, `stage_${s.world.id}_${s.stageIdx}`);
    }
  }

  // Trophées
  const newTrophies = checkTrophies(p, {
    perfect: s.perfect && s.mode === 'stage' && score === total,
    chronoScore: (s.mode === 'chrono' || s.mode === 'worldchrono') ? s.correct : 0,
    sessionXP: p.sessionXP,
  });

  saveData();

  // Affichage écran résultats
  const isChronoMode = s.mode === 'chrono' || s.mode === 'worldchrono';
  document.getElementById('resultsEmoji').textContent =
    isChronoMode ? '⏱️'
    : stars === 3 ? '🏆' : stars === 2 ? '🎉' : score > 0 ? '👍' : '😅';
  document.getElementById('resultsTitle').textContent =
    s.mode === 'survival' ? `Survécu ${s.correct} questions !`
    : isChronoMode ? `${s.correct} bonnes réponses en ${s.globalChrono}s !`
    : stars === 3 ? 'Parfait !'
    : stars === 2 ? 'Bien joué !'
    : 'Continue !';
  document.getElementById('resScore').textContent =
    s.mode === 'survival' || isChronoMode ? `${s.correct}` : `${score}/${total}`;
  document.getElementById('resXP').textContent = `+${xpGain}`;
  let bestVal;
  if (s.mode === 'survival') bestVal = p.survivalBest;
  else if (s.mode === 'chrono') bestVal = p.stages[`${s.world.id}_${s.stageIdx}_chrono`]?.best ?? s.correct;
  else if (s.mode === 'worldchrono') bestVal = p.stages[`${s.world.id}_worldchrono`]?.best ?? s.correct;
  else if (s.mode === 'stage') bestVal = p.stages[`${s.world.id}_${s.stageIdx}`]?.best ?? score;
  else bestVal = p.stages[`${s.world.id}_boss`]?.best ?? score;
  document.getElementById('resBest').textContent = bestVal;
  document.getElementById('resStars').innerHTML =
    (s.mode === 'survival' || isChronoMode) ? '' : `${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`;

  // Décomposition par statut (justesse + vitesse)
  const tEl = document.getElementById('resTricks');
  if (tEl) {
    const sc = s.statusCount || {};
    const tot = (sc.MASTERED || 0) + (sc.CORRECT || 0) + (sc.SLOW || 0) + (sc.WRONG || 0);
    if (tot > 0 && s.mode !== 'duel') {
      const masterRatio = Math.round((sc.MASTERED || 0) / tot * 100);
      let coachMsg;
      if (masterRatio >= 70) coachMsg = `💎 <b>${masterRatio}%</b> d'astuces utilisées avec aisance — bravo !`;
      else if (masterRatio >= 40) coachMsg = `<b>${masterRatio}%</b> de tes réponses montrent l'astuce intégrée. Continue, ça vient !`;
      else if ((sc.SLOW||0) > 0) coachMsg = `Tu trouves les bonnes réponses. <b>Essaye d'utiliser l'astuce</b> plutôt que de poser le calcul — relis la leçon !`;
      else coachMsg = `<b>${masterRatio}%</b> d'astuces utilisées. L'objectif : que l'astuce devienne ton réflexe naturel.`;

      tEl.innerHTML = `
        <div class="rt rt-m"><b>${sc.MASTERED || 0}</b><span>💎 Réflexe</span></div>
        <div class="rt rt-c"><b>${sc.CORRECT || 0}</b><span>✅ Bon</span></div>
        <div class="rt rt-s"><b>${sc.SLOW || 0}</b><span>🐢 Lent</span></div>
        <div class="rt rt-w"><b>${sc.WRONG || 0}</b><span>❌ Faux</span></div>
        <div class="results-tricks-summary">${coachMsg}</div>
      `;
    } else {
      tEl.innerHTML = '';
    }
  }
  const badgesEl = document.getElementById('resBadges');
  badgesEl.innerHTML = '';
  if (lvlGain > 0) {
    const b = document.createElement('div'); b.className = 'badge'; b.textContent = `🎚 Niveau ${levelFor(p.xp).level} !`;
    badgesEl.appendChild(b);
  }
  newTrophies.forEach(t => {
    const tr = TROPHIES.find(x => x.id === t);
    if (tr) {
      const b = document.createElement('div'); b.className = 'badge'; b.textContent = `${tr.emoji} ${tr.name}`;
      badgesEl.appendChild(b);
    }
  });

  if (stars === 3 || (s.mode === 'survival' && s.correct >= 10)) confetti(50);

  // Level up : overlay spectaculaire au milieu, puis on revient sur l'écran de résultats
  if (lvlGain > 0) {
    setTimeout(() => showLevelUp(p, lvlAfter), 600);
    sndLevel();
  }
  // Trophées en toast
  newTrophies.forEach((t, idx) => {
    const tr = TROPHIES.find(x => x.id === t);
    if (tr) setTimeout(() => trophyToast(tr), 1200 + idx * 600);
  });

  document.getElementById('btnReplay').onclick = () => {
    if (s.mode === 'stage') startExercise({ world: s.world, stageIdx: s.stageIdx, mode: 'stage' });
    else if (s.mode === 'chrono') startExercise({ world: s.world, stageIdx: s.stageIdx, mode: 'chrono' });
    else if (s.mode === 'worldchrono') startExercise({ world: s.world, mode: 'worldchrono' });
    else if (s.mode === 'boss') startExercise({ world: s.world, mode: 'boss' });
    else if (s.mode === 'daily') startExercise({ mode: 'daily' });
    else if (s.mode === 'survival') startExercise({ mode: 'survival' });
    else if (s.mode === 'review') startExercise({ mode: 'review' });
    else if (s.mode === 'weak') startExercise({ mode: 'weak' });
  };
  document.getElementById('btnReturn').onclick = () => {
    if (s.mode === 'stage' || s.mode === 'boss' || s.mode === 'chrono' || s.mode === 'worldchrono') {
      if (s.world) showWorld(s.world); else showMap();
    } else showMap();
  };

  showScreen('screen-results');
  // Coup de grâce : on libère la session pour qu'aucun événement résiduel
  // (timer, double-tap, hash de Suivant) ne puisse relancer un cycle.
  state.session = null;
}

/* ============================================================
   TROPHÉES
   ============================================================ */
function showTrophies() {
  const grid = document.getElementById('trophyGrid');
  grid.innerHTML = '';
  const p = state.current;
  // Stats en haut
  const unlocked = TROPHIES.filter(t => p.trophies[t.id]).length;
  const stats = document.createElement('div');
  stats.style.cssText = 'grid-column:1/-1;text-align:center;margin-bottom:14px';
  stats.innerHTML = `<div style="font-size:48px">🏆</div><div style="font-size:24px;font-weight:900;color:var(--accent)">${unlocked} / ${TROPHIES.length}</div><div style="color:var(--text-soft);font-size:13px">trophées débloqués</div>`;
  grid.appendChild(stats);
  TROPHIES.forEach(t => {
    const got = !!p.trophies[t.id];
    const card = document.createElement('div');
    card.className = 'trophy-card' + (got ? '' : ' locked');
    card.innerHTML = `
      <div class="te">${t.emoji}</div>
      <div class="tn">${t.name}</div>
      <div class="td">${t.desc}</div>
    `;
    grid.appendChild(card);
  });
  showScreen('screen-trophies');
}

/* ============================================================
   INIT EVENTS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderProfiles();
  showScreen('screen-profiles');

  // First visit ?
  if (!localStorage.getItem('calastu_seen')) {
    document.getElementById('modalAbout').classList.add('show');
    localStorage.setItem('calastu_seen', '1');
  }

  // Boutons globaux back
  document.querySelectorAll('.btn-back[data-target]').forEach(b => {
    b.addEventListener('click', () => showScreen(b.dataset.target));
  });

  document.getElementById('btnNewProfile').addEventListener('click', () => {
    _newProfileTmp = { avatar: AVATARS[0], classe: 'CM1' };
    renderNewProfile();
    showScreen('screen-newprofile');
  });

  document.getElementById('btnCreateProfile').addEventListener('click', () => {
    const name = document.getElementById('newName').value.trim();
    if (!name) {
      document.getElementById('newName').style.borderColor = 'var(--bad)';
      document.getElementById('newName').focus();
      return;
    }
    const p = newProfile(name, _newProfileTmp.avatar, _newProfileTmp.classe);
    state.data.profiles.push(p);
    state.current = p;
    state.data.lastProfile = p.id;
    saveData();
    // Test de placement pour évaluer le niveau d'astuces
    document.getElementById('placementIntro').style.display = '';
    document.getElementById('placementRunning').style.display = 'none';
    document.getElementById('placementResult').style.display = 'none';
    showScreen('screen-placement');
  });

  // Test de placement
  document.getElementById('btnStartPlacement').addEventListener('click', startPlacement);
  document.getElementById('btnSkipPlacement').addEventListener('click', () => showMap());
  document.getElementById('placementSubmit').addEventListener('click', placementSubmitAnswer);
  document.getElementById('placementAnswer').addEventListener('keydown', e => { if (e.key === 'Enter') placementSubmitAnswer(); });
  // Le keypad du placement est déjà bind via bindFastKeypad plus haut.

  document.getElementById('btnAbout').addEventListener('click', () => {
    document.getElementById('modalAbout').classList.add('show');
  });
  document.getElementById('btnAboutClose').addEventListener('click', () => {
    document.getElementById('modalAbout').classList.remove('show');
  });

  // Modes
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      if (mode === 'duel') return openDuelSetup();
      if (mode === 'wrapped') return showWrapped();
      startExercise({ mode });
    });
  });

  // Espace parent
  document.getElementById('btnParentMode').addEventListener('click', openParentMode);
  document.getElementById('btnPinSubmit').addEventListener('click', submitPin);
  document.getElementById('pinInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitPin(); });
  document.getElementById('btnPinReset').addEventListener('click', () => {
    if (confirm('Réinitialiser le PIN ? Tu devras en créer un nouveau.')) {
      state.data.parentPin = null;
      saveData();
      openParentMode();
    }
  });

  // Duel
  document.querySelectorAll('.duel-rounds button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.duel-rounds button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
  });
  document.querySelectorAll('.duel-diff button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.duel-diff button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
  });
  document.getElementById('btnStartDuel').addEventListener('click', startDuel);
  document.getElementById('duelSubmit').addEventListener('click', () => duelSubmit());
  document.getElementById('duelAnswer').addEventListener('keydown', e => { if (e.key === 'Enter') duelSubmit(); });
  bindFastKeypad('#duelKeypad button', 'duelAnswer');
  document.getElementById('duelQuit').addEventListener('click', () => {
    if (confirm('Quitter le duel ?')) {
      if (duel.timer) clearTimeout(duel.timer);
      showScreen('screen-map');
    }
  });

  // Notifications : tente d'activer le rappel auto si déjà autorisé
  if ('Notification' in window && Notification.permission === 'granted') {
    scheduleNotificationCheck();
  }

  // Trophées
  document.getElementById('btnTrophies').addEventListener('click', showTrophies);
  // Boutique
  document.getElementById('btnShop').addEventListener('click', showShop);

  // Plein écran (force le mode immersif via Fullscreen API)
  document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);

  // Export / Import
  document.getElementById('btnExport').addEventListener('click', () => {
    if (state.current) openExportModal(state.current);
  });
  document.getElementById('btnImport').addEventListener('click', openImportModal);
  document.getElementById('btnBackupClose').addEventListener('click', () => {
    document.getElementById('modalBackup').classList.remove('show');
  });

  // Leçon
  document.getElementById('btnLesson').addEventListener('click', () => showLesson(currentWorld));

  // Boss du monde
  document.getElementById('btnBoss').addEventListener('click', () => {
    startExercise({ world: currentWorld, mode: 'boss' });
  });

  // Challenge Chrono du monde
  document.getElementById('btnChallenge').addEventListener('click', () => {
    startExercise({ world: currentWorld, mode: 'worldchrono' });
  });

  // Submit answer
  document.getElementById('btnSubmit').addEventListener('click', () => submitAnswer());
  document.getElementById('exAnswer').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });

  // Keypad — chemin de saisie ULTRA RAPIDE
  // 1. Mise à jour du texte : synchrone, immédiate (priorité absolue)
  // 2. Vibration & animation : différées (ne doivent JAMAIS bloquer la frappe)
  function fastKeyPress(b, inputId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    // Si c'est le 1er tap de la question : note le temps (réflexion pure)
    if (state.session && state.session.firstKeyTime == null && inputId === 'exAnswer') {
      state.session.firstKeyTime = Date.now();
    }
    const k = b.dataset.key;
    // Mise à jour synchrone du texte — c'est tout ce qui doit se passer en priorité
    if (k === 'back') inp.value = inp.value.slice(0, -1);
    else if (k === '-') {
      if (inp.value.startsWith('-')) inp.value = inp.value.slice(1);
      else inp.value = '-' + inp.value;
    }
    else if (k === ',') { if (!inp.value.includes(',')) inp.value += ','; }
    else if (k === '/') { if (!inp.value.includes('/')) inp.value += '/'; }
    else inp.value += k;
    // Animation visuelle + vibration : différées, n'impactent pas la frappe
    b.classList.add('tapped');
    requestAnimationFrame(() => {
      setTimeout(() => b.classList.remove('tapped'), 80);
    });
    buzzTap(); // déjà différé via requestIdleCallback
  }
  function bindFastKeypad(selector, inputId) {
    document.querySelectorAll(selector).forEach(b => {
      let handled = false;
      // pointerdown = se déclenche AU TOUCHER, sans attendre touchend → 0 latence
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handled = true;
        fastKeyPress(b, inputId);
      }, { passive: false });
      b.addEventListener('click', (e) => {
        if (handled) { handled = false; return; }
        fastKeyPress(b, inputId);
      });
    });
  }
  // Bind les 3 keypads (sélecteur précis pour chacun pour éviter mélanges)
  bindFastKeypad('#exKeypad button', 'exAnswer');
  bindFastKeypad('#placementKeypad button', 'placementAnswer');

  // Next after feedback
  document.getElementById('btnNext').addEventListener('click', nextAfterFeedback);

  // Quitter exercice
  document.getElementById('btnQuitExercise').addEventListener('click', () => {
    showConfirm('Quitter ?', 'Tu vas perdre ta progression dans ce niveau.', () => {
      const s = state.session;
      if (s && s.timer) clearTimeout(s.timer);
      state.session = null;
      if (currentWorld) showWorld(currentWorld);
      else showMap();
    });
  });
});

/* ============================================================
   EXPORT / IMPORT — sauvegarde par profil
   ============================================================ */

function profileToCode(profile) {
  const payload = { v: 1, type: 'calastu_profile', profile };
  // base64 du JSON pour un code compact + safe à coller
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

function codeToProfile(code) {
  try {
    const trimmed = code.replace(/\s+/g, '');
    const json = decodeURIComponent(escape(atob(trimmed)));
    const obj = JSON.parse(json);
    if (obj && obj.type === 'calastu_profile' && obj.profile && obj.profile.name) return obj.profile;
  } catch(e) {}
  // Try as raw JSON (fichier export brut)
  try {
    const obj = JSON.parse(code);
    if (obj && obj.profile && obj.profile.name) return obj.profile;
    if (obj && obj.name && obj.id) return obj;
  } catch(e) {}
  return null;
}

function exportProfile(profile) {
  const blob = new Blob([JSON.stringify({ v: 1, type: 'calastu_profile', profile }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = profile.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `Calastu_${safeName}.calastu`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function importProfile(profileObj) {
  // Crée un nouvel ID si conflit
  const existing = state.data.profiles.find(p => p.id === profileObj.id);
  if (existing) {
    if (!confirm(`Un profil "${existing.name}" existe déjà avec cet identifiant. L'écraser ?`)) {
      // sinon on duplique avec nouvel ID
      profileObj = { ...profileObj, id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: profileObj.name + ' (copie)' };
      state.data.profiles.push(profileObj);
    } else {
      Object.assign(existing, profileObj);
    }
  } else {
    state.data.profiles.push(profileObj);
  }
  saveData();
  renderProfiles();
  flash(`Profil de ${profileObj.name} importé !`);
}

function openExportModal(profile) {
  const code = profileToCode(profile);
  document.getElementById('backupTitle').textContent = `💾 Sauvegarde — ${profile.name}`;
  document.getElementById('backupIntro').textContent = `Sauvegarde la progression de ${profile.name} pour la restaurer plus tard ou sur un autre appareil.`;
  document.getElementById('backupExportBlock').style.display = '';
  document.getElementById('backupImportBlock').style.display = 'none';
  document.getElementById('backupCode').value = code;
  document.getElementById('btnDownloadBackup').onclick = () => exportProfile(profile);
  document.getElementById('btnCopyCode').onclick = () => {
    document.getElementById('backupCode').select();
    try {
      navigator.clipboard.writeText(code);
      flash('Code copié !');
    } catch(e) { document.execCommand('copy'); flash('Code copié !'); }
  };
  document.getElementById('modalBackup').classList.add('show');
}

function openImportModal() {
  document.getElementById('backupTitle').textContent = '📥 Importer une sauvegarde';
  document.getElementById('backupIntro').textContent = 'Restaure une progression depuis un fichier .calastu ou un code copié.';
  document.getElementById('backupExportBlock').style.display = 'none';
  document.getElementById('backupImportBlock').style.display = '';
  document.getElementById('importCode').value = '';

  document.getElementById('btnUploadFile').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const profile = codeToProfile(reader.result);
      if (profile) {
        importProfile(profile);
        document.getElementById('modalBackup').classList.remove('show');
      } else {
        flash('Fichier invalide');
      }
    };
    reader.readAsText(f);
  };

  document.getElementById('btnPasteImport').onclick = () => {
    const code = document.getElementById('importCode').value.trim();
    if (!code) { flash('Colle un code'); return; }
    const profile = codeToProfile(code);
    if (profile) {
      importProfile(profile);
      document.getElementById('modalBackup').classList.remove('show');
    } else {
      flash('Code invalide');
    }
  };

  document.getElementById('modalBackup').classList.add('show');
}

/* ============================================================
   TEST DE PLACEMENT — mesure justesse + vitesse
   ============================================================ */
const placement = {
  questions: [],   // [{ ex, drillKey, level }]
  index: 0,
  results: [],     // [{ status, elapsed, level, drillKey }]
  startTime: 0,
  zoneTimer: null,
};

function buildPlacementQuestions() {
  // 10 questions de difficulté croissante, couvrant les astuces clés
  const qs = [];
  // 3 niveau "primaire"
  qs.push({ gen: () => { const ex = gen_x10_simple(); ex.drillKey = 'x10'; return ex; }, level: 1 });
  qs.push({ gen: () => { const ex = gen_compl10(); ex.drillKey = 'compl10'; return ex; }, level: 1 });
  qs.push({ gen: () => { const ex = gen_x5(); ex.drillKey = 'x5'; return ex; }, level: 2 });
  // 3 niveau "intermédiaire"
  qs.push({ gen: () => { const ex = gen_compl100(); ex.drillKey = 'compl100'; return ex; }, level: 3 });
  qs.push({ gen: () => { const ex = gen_x9(); ex.drillKey = 'x9'; return ex; }, level: 3 });
  qs.push({ gen: () => { const ex = gen_x01(); ex.drillKey = 'x01'; return ex; }, level: 4 });
  // 2 niveau "avancé"
  qs.push({ gen: () => { const ex = gen_x25(); ex.drillKey = 'x25_50'; return ex; }, level: 5 });
  qs.push({ gen: () => { const ex = gen_x11_simple(); ex.drillKey = 'x11'; return ex; }, level: 5 });
  // 2 niveau "expert"
  qs.push({ gen: () => { const ex = gen_carre_5(); ex.drillKey = 'carre5'; return ex; }, level: 7 });
  qs.push({ gen: () => { const ex = gen_comp_mult(); ex.drillKey = 'compMult'; return ex; }, level: 8 });
  return qs.map(q => ({ ex: q.gen(), drillKey: q.ex?.drillKey || 'x10', level: q.level, gen: q.gen }));
}

function startPlacement() {
  document.getElementById('placementIntro').style.display = 'none';
  document.getElementById('placementResult').style.display = 'none';
  document.getElementById('placementRunning').style.display = '';
  placement.questions = buildPlacementQuestions();
  placement.index = 0;
  placement.results = [];
  placementNext();
}

let placementZoneRAF = null;
function placementStartZone(drillKey) {
  if (placementZoneRAF) cancelAnimationFrame(placementZoneRAF);
  const t = thresholdFor(drillKey);
  const max = t.ok * 1.5;
  const bar = document.getElementById('placementZoneBar');
  const mF = document.getElementById('placementZoneFast');
  const mO = document.getElementById('placementZoneOk');
  if (mF) mF.style.left = (t.fast / max * 100) + '%';
  if (mO) mO.style.left = (t.ok / max * 100) + '%';
  if (bar) bar.style.width = '0%';
  const start = Date.now();
  function tick() {
    const elapsed = (Date.now() - start) / 1000;
    if (bar) bar.style.width = Math.min(100, elapsed/max*100) + '%';
    if (elapsed < max) placementZoneRAF = requestAnimationFrame(tick);
  }
  placementZoneRAF = requestAnimationFrame(tick);
}

function placementNext() {
  if (placement.index >= placement.questions.length) {
    return placementFinish();
  }
  const q = placement.questions[placement.index];
  document.getElementById('placementTrick').textContent = q.ex.trick;
  document.getElementById('placementQuestion').innerHTML = formatQuestion(q.ex.question);
  document.getElementById('placementAnswer').value = '';
  document.getElementById('placementCounter').textContent = `${placement.index + 1} / ${placement.questions.length}`;
  document.getElementById('placementProgressFill').style.width = (placement.index / placement.questions.length * 100) + '%';
  placement.startTime = Date.now();
  placementStartZone(q.drillKey);
}

function placementSubmitAnswer() {
  const q = placement.questions[placement.index];
  if (!q) return;
  const userInput = document.getElementById('placementAnswer').value;
  const isGood = answerEquals(userInput, q.ex.answer);
  const elapsed = (Date.now() - placement.startTime) / 1000;
  if (placementZoneRAF) cancelAnimationFrame(placementZoneRAF);

  const evalR = evaluateAnswer(isGood, elapsed, q.drillKey);
  placement.results.push({
    status: evalR.status, elapsed, level: q.level, drillKey: q.drillKey,
    ex: q.ex, isGood,
  });
  // Enregistre la skill comme un exo classique
  recordSkillStatus(state.current, q.drillKey, evalR.status, elapsed);

  if (isGood) { sndGood(); buzzGood(); }
  else { sndBad(); buzzBad(); }

  placement.index++;
  setTimeout(placementNext, 350);
}

function placementFinish() {
  document.getElementById('placementRunning').style.display = 'none';
  document.getElementById('placementResult').style.display = '';

  // Analyse : on calcule le "niveau d'astuce" atteint
  // Score basé sur MASTERED uniquement (vraie astuce)
  const masteredLevels = placement.results.filter(r => r.status === 'MASTERED').map(r => r.level);
  const correctLevels = placement.results.filter(r => r.status === 'CORRECT').map(r => r.level);
  const slowLevels = placement.results.filter(r => r.status === 'SLOW').map(r => r.level);
  const wrongLevels = placement.results.filter(r => r.status === 'WRONG').map(r => r.level);

  // "Niveau d'astuce" = plus haut niveau atteint en MASTERED
  const masterCeiling = masteredLevels.length > 0 ? Math.max(...masteredLevels) : 0;
  const correctCeiling = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;

  const p = state.current;
  // Pré-déverrouille les mondes selon le ceiling
  // Niveau 1-2 : Monde 1 OK
  // Niveau 3-4 : Mondes 1-2 marqués, accès Monde 3
  // Niveau 5-6 : Mondes 1-3 marqués, accès Monde 4-5
  // Niveau 7+ : Mondes 1-5 marqués, accès Monde 6+
  let prefilled = 0;
  if (masterCeiling >= 7) {
    // Pré-marque Mondes 1-5 (zeros, compl, mult, decomp, comp) avec 2★
    ['zeros', 'compl', 'mult', 'decomp', 'comp'].forEach(wid => {
      const w = WORLDS.find(x => x.id === wid);
      if (!w) return;
      w.stages.forEach((stage, i) => {
        if (stage.drill) return;
        const k = `${w.id}_${i}`;
        if (!p.stages[k] || (p.stages[k].stars || 0) < 2) {
          p.stages[k] = { stars: 2, best: Math.floor(stage.count * 0.85), completed: true };
          prefilled++;
        }
      });
    });
    // XP de départ
    p.xp = Math.max(p.xp, 800);
  } else if (masterCeiling >= 5) {
    ['zeros', 'compl', 'mult'].forEach(wid => {
      const w = WORLDS.find(x => x.id === wid);
      if (!w) return;
      w.stages.forEach((stage, i) => {
        if (stage.drill) return;
        const k = `${w.id}_${i}`;
        if (!p.stages[k]) {
          p.stages[k] = { stars: 2, best: Math.floor(stage.count * 0.8), completed: true };
          prefilled++;
        }
      });
    });
    p.xp = Math.max(p.xp, 400);
  } else if (masterCeiling >= 3) {
    ['zeros', 'compl'].forEach(wid => {
      const w = WORLDS.find(x => x.id === wid);
      if (!w) return;
      w.stages.forEach((stage, i) => {
        if (stage.drill) return;
        const k = `${w.id}_${i}`;
        if (!p.stages[k]) {
          p.stages[k] = { stars: 2, best: Math.floor(stage.count * 0.8), completed: true };
          prefilled++;
        }
      });
    });
    p.xp = Math.max(p.xp, 150);
  }
  saveData();

  // Affichage du résumé
  const m = masteredLevels.length;
  const c = correctLevels.length;
  const sl = slowLevels.length;
  const w = wrongLevels.length;

  let verdict, recommendation;
  if (masterCeiling >= 7) {
    verdict = '🏆 Niveau Expert';
    recommendation = 'Tu as déjà beaucoup d\'astuces intégrées ! On te place direct dans les mondes avancés. Tu peux toujours revenir en arrière.';
  } else if (masterCeiling >= 5) {
    verdict = '⭐ Niveau Confirmé';
    recommendation = 'Tu maîtrises plusieurs astuces. On te place dans la zone intermédiaire pour ne pas t\'ennuyer.';
  } else if (masterCeiling >= 3) {
    verdict = '🌱 Niveau Débutant +';
    recommendation = 'Tu commences à utiliser des astuces — on te place au début, mais avec quelques mondes déjà partiellement débloqués.';
  } else if (correctCeiling >= 5) {
    verdict = '🎓 Tu sais calculer mais sans astuces';
    recommendation = 'Tu as les bons résultats mais en posant les calculs. L\'objectif : automatiser les astuces pour gagner en vitesse !';
  } else {
    verdict = '🌱 Apprenti';
    recommendation = 'On commence depuis le début. À toi de devenir un as du calcul astucieux !';
  }

  const tableRows = placement.results.map((r, i) => `
    <div class="placement-row">
      <span class="prnum">${i+1}</span>
      <span class="prq">${escapeHTML(r.ex.question)}</span>
      <span class="prt">${r.elapsed.toFixed(1)}s</span>
      <span class="prs prs-${r.status.toLowerCase()}">${r.status === 'MASTERED' ? '💎' : r.status === 'CORRECT' ? '✅' : r.status === 'SLOW' ? '🐢' : '❌'}</span>
    </div>
  `).join('');

  document.getElementById('placementResult').innerHTML = `
    <div style="text-align:center">
      <div style="font-size:60px">${verdict.slice(0, 2)}</div>
      <h2 style="margin:10px 0">${verdict.slice(2).trim()}</h2>
    </div>
    <div class="results-tricks">
      <div class="rt rt-m"><b>${m}</b><span>💎 Réflexe</span></div>
      <div class="rt rt-c"><b>${c}</b><span>✅ Bon</span></div>
      <div class="rt rt-s"><b>${sl}</b><span>🐢 Lent</span></div>
      <div class="rt rt-w"><b>${w}</b><span>❌ Faux</span></div>
    </div>
    <div class="placement-recommendation">${recommendation}</div>
    ${prefilled > 0 ? `<div class="placement-prefilled">✨ <b>${prefilled} stages</b> pré-débloqués selon ton niveau !</div>` : ''}
    <div class="placement-table">${tableRows}</div>
    <button class="btn btn-primary" id="btnPlacementGoMap">▶️ Commencer l'aventure !</button>
  `;
  document.getElementById('btnPlacementGoMap').onclick = () => showMap();
}

/* ============================================================
   DUEL — partie 2 joueurs sur le même téléphone
   ============================================================ */
const duel = {
  p1: null, p2: null, currentPlayer: 1,
  rounds: 6, round: 1,
  diff: 'med',
  scores: [0, 0],
  timer: null, timeLeft: 10, timeMax: 10,
  currentEx: null, recent: [],
};

function openDuelSetup() {
  if (state.data.profiles.length < 2) {
    flash('Crée au moins 2 profils pour faire un duel !');
    return;
  }
  const p1 = document.getElementById('duelP1');
  const p2 = document.getElementById('duelP2');
  p1.innerHTML = '';
  p2.innerHTML = '';
  state.data.profiles.forEach((p, idx) => {
    const o1 = document.createElement('option'); o1.value = p.id; o1.textContent = `${p.avatar} ${p.name}`;
    const o2 = o1.cloneNode(true);
    p1.appendChild(o1);
    p2.appendChild(o2);
  });
  if (state.data.profiles.length >= 2) p2.selectedIndex = 1;
  document.querySelectorAll('.duel-rounds button').forEach(b => b.classList.toggle('sel', b.dataset.rounds === '6'));
  document.querySelectorAll('.duel-diff button').forEach(b => b.classList.toggle('sel', b.dataset.diff === 'med'));
  showScreen('screen-duel-setup');
}

function startDuel() {
  const p1id = document.getElementById('duelP1').value;
  const p2id = document.getElementById('duelP2').value;
  if (p1id === p2id) { flash('Choisis deux profils différents !'); return; }
  duel.p1 = state.data.profiles.find(p => p.id === p1id);
  duel.p2 = state.data.profiles.find(p => p.id === p2id);
  duel.rounds = parseInt(document.querySelector('.duel-rounds button.sel').dataset.rounds) || 6;
  duel.diff = document.querySelector('.duel-diff button.sel').dataset.diff || 'med';
  duel.scores = [0, 0];
  duel.round = 1;
  duel.currentPlayer = 1;
  duel.recent = [];
  // temps par question selon difficulté
  duel.timeMax = duel.diff === 'easy' ? 15 : duel.diff === 'med' ? 10 : 7;

  document.getElementById('duelAv1').innerHTML = avatarHTML(duel.p1);
  document.getElementById('duelAv2').innerHTML = avatarHTML(duel.p2);
  document.getElementById('duelName1').textContent = duel.p1.name;
  document.getElementById('duelName2').textContent = duel.p2.name;

  showScreen('screen-duel-play');
  duelNext();
}

function duelGen() {
  if (duel.diff === 'easy') return GEN_DAILY(2);
  if (duel.diff === 'med') return GEN_DAILY(8);
  return GEN_DAILY(15);
}

function duelNext() {
  if (duel.round > duel.rounds) {
    duelEnd();
    return;
  }
  // Anti-doublon
  let ex, attempts = 0;
  do { ex = duelGen(); attempts++; } while (duel.recent.includes(ex.question) && attempts < 8);
  duel.recent.push(ex.question);
  if (duel.recent.length > 6) duel.recent.shift();
  duel.currentEx = ex;

  document.getElementById('duelTrick').textContent = ex.trick;
  document.getElementById('duelQuestion').innerHTML = formatQuestion(ex.question);
  document.getElementById('duelAnswer').value = '';
  document.getElementById('duelProgress').textContent = `Manche ${duel.round} / ${duel.rounds}`;
  document.getElementById('duelScore1').textContent = duel.scores[0];
  document.getElementById('duelScore2').textContent = duel.scores[1];
  // Surbrillance joueur actif
  document.getElementById('duelSide1').classList.toggle('active', duel.currentPlayer === 1);
  document.getElementById('duelSide2').classList.toggle('active', duel.currentPlayer === 2);
  const cur = duel.currentPlayer === 1 ? duel.p1 : duel.p2;
  document.getElementById('duelTurnText').textContent = `🎯 À toi, ${cur.name} !`;

  // Timer
  if (duel.timer) clearTimeout(duel.timer);
  duel.timeLeft = duel.timeMax;
  const bar = document.getElementById('duelTimerBar');
  bar.style.transition = 'none'; bar.style.width = '100%';
  requestAnimationFrame(() => {
    bar.style.transition = `width ${duel.timeMax}s linear`;
    bar.style.width = '0%';
  });
  duel.timer = setTimeout(() => duelSubmit(true), duel.timeMax * 1000);
}

function duelSubmit(timeout = false) {
  if (!duel.currentEx) return;
  if (duel.timer) { clearTimeout(duel.timer); duel.timer = null; }
  const userInput = document.getElementById('duelAnswer').value;
  const ex = duel.currentEx;
  const isGood = !timeout && answerEquals(userInput, ex.answer);

  // Score : +10 bonne réponse, +5 bonus si rapide (<5s pour med)
  if (isGood) {
    duel.scores[duel.currentPlayer - 1] += 10;
    sndGood();
  } else {
    sndBad();
    document.getElementById('duelCard').classList.add('shake');
    setTimeout(() => document.getElementById('duelCard').classList.remove('shake'), 400);
  }

  // Affichage feedback rapide (1s) puis tour suivant
  document.getElementById('duelTrick').innerHTML = isGood
    ? `<span style="color:var(--good);font-weight:900">✓ ${fmt(ex.answer)}</span>`
    : `<span style="color:var(--bad);font-weight:900">✗ Réponse : ${fmt(ex.answer)}</span>`;
  document.getElementById('duelScore1').textContent = duel.scores[0];
  document.getElementById('duelScore2').textContent = duel.scores[1];

  setTimeout(() => {
    // Change de joueur, change de manche après 2 tours
    if (duel.currentPlayer === 1) duel.currentPlayer = 2;
    else { duel.currentPlayer = 1; duel.round++; }
    duelNext();
  }, 1500);
}

function duelEnd() {
  // Fin de duel — affiche résultats sur l'écran de résultats
  const winner = duel.scores[0] > duel.scores[1] ? duel.p1
    : duel.scores[1] > duel.scores[0] ? duel.p2 : null;
  // XP bonus aux deux joueurs
  duel.p1.xp += 30; duel.p2.xp += 30;
  if (winner) winner.xp += 30;
  saveData();

  const arena = document.querySelector('.duel-arena');
  arena.innerHTML = `
    <div class="duel-results-card">
      <div class="winner-emoji">${winner ? '🏆' : '🤝'}</div>
      <h2>${winner ? `${escapeHTML(winner.name)} gagne !` : 'Égalité !'}</h2>
      <div style="margin:18px 0;font-size:16px;color:var(--text-soft)">
        ${escapeHTML(duel.p1.name)} : <b style="color:var(--accent)">${duel.scores[0]}</b> &nbsp;·&nbsp;
        ${escapeHTML(duel.p2.name)} : <b style="color:var(--accent)">${duel.scores[1]}</b>
      </div>
      <p style="color:var(--text-soft);font-size:13px">+30 XP pour chaque joueur ${winner?'· +30 bonus pour le gagnant !':''}</p>
      <button class="btn btn-primary" id="duelReplay" style="margin-top:18px">⚔️ Revanche</button>
      <button class="btn btn-secondary" id="duelBack" style="margin-top:8px">Retour</button>
    </div>
  `;
  if (winner) confetti(80);
  document.getElementById('duelReplay').onclick = openDuelSetup;
  document.getElementById('duelBack').onclick = () => showScreen('screen-map');
}

/* ============================================================
   ESPACE PARENT — code PIN + dashboard
   ============================================================ */
function openParentMode() {
  const hasPin = !!state.data.parentPin;
  document.getElementById('pinPrompt').textContent = hasPin
    ? 'Entre ton code PIN à 4 chiffres pour accéder à l\'espace parent.'
    : 'Crée un code PIN à 4 chiffres pour protéger l\'espace parent.';
  document.getElementById('pinInput').value = '';
  document.getElementById('btnPinReset').style.display = hasPin ? '' : 'none';
  showScreen('screen-parent-pin');
  setTimeout(() => document.getElementById('pinInput').focus(), 100);
}

function submitPin() {
  const pin = document.getElementById('pinInput').value.trim();
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    flash('Code à 4 chiffres requis');
    return;
  }
  if (!state.data.parentPin) {
    state.data.parentPin = pin;
    saveData();
    showParentDashboard();
  } else if (state.data.parentPin === pin) {
    showParentDashboard();
  } else {
    flash('Code incorrect');
    document.getElementById('pinInput').value = '';
  }
}

function showParentDashboard() {
  const cont = document.getElementById('parentDashboard');
  const profiles = state.data.profiles;
  if (profiles.length === 0) {
    cont.innerHTML = '<div class="parent-section"><p>Aucun profil pour l\'instant.</p></div>';
    showScreen('screen-parent-dash');
    return;
  }

  let html = '';
  profiles.forEach(p => {
    const lvl = levelFor(p.xp);
    const rank = rankFor(lvl.level);
    const totalExos = Object.values(p.activity || {}).reduce((s, a) => s + a.exos, 0);
    const totalCorrect = Object.values(p.activity || {}).reduce((s, a) => s + a.correct, 0);
    const accuracy = totalExos ? Math.round(totalCorrect / totalExos * 100) : 0;
    const totalMin = Math.round(p.totalMinutes || 0);
    const weak = weakSkills(p).slice(0, 5);
    const strong = Object.entries(p.skills || {})
      .filter(([k,s]) => s.seen >= 5 && s.box >= 4)
      .sort((a,b) => b[1].seen - a[1].seen)
      .slice(0, 5)
      .map(([k]) => k);

    // Heatmap des 90 derniers jours
    const days = 90;
    const heatmap = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const a = (p.activity || {})[key];
      let lvl2 = 0;
      if (a) {
        if (a.exos >= 30) lvl2 = 4;
        else if (a.exos >= 15) lvl2 = 3;
        else if (a.exos >= 5) lvl2 = 2;
        else if (a.exos >= 1) lvl2 = 1;
      }
      heatmap.push(lvl2);
    }

    html += `
      <div class="parent-kid">
        <div class="parent-kid-header">
          <div class="kid-av">${avatarHTML(p)}</div>
          <div>
            <div class="kid-name">${escapeHTML(p.name)}</div>
            <div class="kid-rank">${p.classe} · Niv. ${lvl.level} · ${rank.name}</div>
          </div>
        </div>
        <div class="parent-kid-stats">
          <div class="pkstat"><b>${totalMin}</b><span>minutes</span></div>
          <div class="pkstat"><b>${totalExos}</b><span>exos</span></div>
          <div class="pkstat"><b>${accuracy}%</b><span>réussite</span></div>
          <div class="pkstat"><b>${p.dayStreak||0}</b><span>jours d'affilée</span></div>
          <div class="pkstat"><b>${Object.values(p.trophies||{}).length}</b><span>trophées</span></div>
          <div class="pkstat"><b>${Object.values(p.stages||{}).filter(s => s.stars >= 3).length}</b><span>maîtrisés (3★)</span></div>
        </div>
        <div style="font-size:11px;color:var(--text-soft);margin-bottom:4px">📅 90 derniers jours</div>
        <div class="heatmap">
          ${heatmap.map(l => `<div class="heatmap-cell ${l > 0 ? 'lvl' + l : ''}"></div>`).join('')}
        </div>
        ${weak.length > 0 ? `<div class="weak-list">⚠️ <b>À travailler :</b> ${weak.map(k => prettyDrillKey(k)).join(', ')}</div>` : ''}
        ${strong.length > 0 ? `<div class="strong-list">✅ <b>Bien acquis :</b> ${strong.map(k => prettyDrillKey(k)).join(', ')}</div>` : ''}
      </div>
    `;

    // Bilan astucieux détaillé
    const report = trickReport(p);
    if (report.length > 0) {
      html += `<div class="parent-section trick-report">
        <h3>🎯 Bilan astucieux — ${escapeHTML(p.name)}</h3>
        <p style="font-size:12px;color:var(--text-soft);margin-bottom:12px">
          Ce qui compte : pas seulement la justesse, mais si l'astuce est <b>utilisée</b> (vitesse).
        </p>`;
      const counts = { mastered: 0, good: 0, learning: 0, slow: 0, failing: 0 };
      report.forEach(r => counts[r.level]++);
      html += `<div class="trick-summary">
        <div class="ts ts-mastered" title="Astuces automatiques"><b>${counts.mastered}</b><span>💎 réflexe</span></div>
        <div class="ts ts-good" title="En automatisation"><b>${counts.good}</b><span>⚡ bon</span></div>
        <div class="ts ts-learning" title="En apprentissage"><b>${counts.learning}</b><span>🌱 j'apprends</span></div>
        <div class="ts ts-slow" title="Sait mais sans astuce"><b>${counts.slow}</b><span>🐢 lent</span></div>
        <div class="ts ts-failing" title="Mal compris"><b>${counts.failing}</b><span>❌ rate</span></div>
      </div>`;
      html += `<details class="trick-details"><summary>Détail astuce par astuce</summary>`;
      report.forEach(r => {
        const speed = r.avgTime != null ? `<span class="tr-speed">~${r.avgTime.toFixed(1)}s</span>` : '';
        html += `<div class="trick-row trick-${r.level}">
          <span class="tr-icon">${r.status}</span>
          <div class="tr-body">
            <div class="tr-name">${prettyDrillKey(r.key)} ${speed}</div>
            <div class="tr-advice">${r.advice}</div>
          </div>
        </div>`;
      });
      html += `</details></div>`;
    }
  });

  // Comparaison rapide
  if (profiles.length >= 2) {
    html += `<div class="parent-section">
      <h3>🏅 Classement</h3>
      ${[...profiles].sort((a,b) => b.xp - a.xp).map((p, i) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
          <span>${['🥇','🥈','🥉'][i] || (i+1+'.')} <b>${escapeHTML(p.name)}</b></span>
          <span>${p.xp} XP · Niv. ${levelFor(p.xp).level}</span>
        </div>`
      ).join('')}
    </div>`;
  }

  // Section paramètres
  html += `<div class="parent-section">
    <h3>⚙️ Paramètres</h3>
    <button class="btn btn-secondary" id="btnNotifEnable">🔔 Activer les rappels quotidiens</button>
    <p id="notifStatus" style="font-size:11px;color:var(--text-soft);margin-top:6px"></p>
    <button class="btn btn-secondary" id="btnChangePin" style="margin-top:10px">🔐 Changer le code PIN</button>
  </div>`;

  cont.innerHTML = html;
  showScreen('screen-parent-dash');

  // Bind notifications
  document.getElementById('btnNotifEnable').onclick = enableNotifications;
  document.getElementById('btnChangePin').onclick = () => {
    state.data.parentPin = null;
    saveData();
    flash('PIN réinitialisé. Crée-en un nouveau.');
    openParentMode();
  };
  updateNotifStatus();
}

/* Construit le bilan astucieux d'un enfant : pour chaque astuce,
   donne son statut d'apprentissage et une recommandation parentale */
function trickReport(profile) {
  const skills = profile.skills || {};
  const lines = [];
  Object.entries(skills).forEach(([key, s]) => {
    if (s.seen < 3) return; // pas assez de data
    const masteredRatio = (s.mastered || 0) / s.seen;
    const errorRatio = s.errors / s.seen;
    const slowRatio = (s.slow || 0) / s.seen;
    let status, level, advice;
    if (masteredRatio >= 0.7 && s.box >= 4) {
      status = '💎'; level = 'mastered';
      advice = 'Astuce automatique. Continue les révisions espacées.';
    } else if (masteredRatio >= 0.4) {
      status = '⚡'; level = 'good';
      advice = 'En cours d\'automatisation. Quelques drills pour finir le travail.';
    } else if (errorRatio < 0.2 && slowRatio > 0.4) {
      status = '🐢'; level = 'slow';
      advice = '⚠️ Sait calculer mais sans utiliser l\'astuce. Drill prioritaire.';
    } else if (errorRatio > 0.4) {
      status = '❌'; level = 'failing';
      advice = '🚨 Astuce mal comprise. Refaire la leçon avant tout.';
    } else {
      status = '🌱'; level = 'learning';
      advice = 'En apprentissage. Continue régulièrement.';
    }
    lines.push({
      key, status, level, advice,
      seen: s.seen,
      avgTime: s.avgTime,
      bestTime: s.bestTime,
      masteredRatio,
      errorRatio,
      slowRatio,
    });
  });
  // Trie : failing/slow d'abord (à travailler), puis learning, puis good, puis mastered
  const order = { failing: 0, slow: 1, learning: 2, good: 3, mastered: 4 };
  lines.sort((a, b) => order[a.level] - order[b.level]);
  return lines;
}

function prettyDrillKey(k) {
  const map = {
    x10: '×10/100', x10dec: 'décimaux', div10: '÷10', x01: '×0,1', div01: '÷0,1',
    compl10: 'comp.10', compl100: 'comp.100', complRound: 'comp.dizaine', compl1000: 'comp.1000', complDec: 'comp.décim.',
    x5: '×5', x9: '×9', x11: '×11', x25_50: '×25/50', x4_8: '×4/8',
    addDecomp: 'add. décomp.', subDecomp: 'sub. décomp.', friends: 'amis 100',
    compMult: 'comp. mult.', compSub: 'comp. sub.',
    distSimple: 'distrib.', distMed: 'distrib.+', distFactor: 'factoris.',
    carre5: 'carrés en 5', carreSimple: 'carrés', carre100: 'carrés ~100',
    pbAdd: 'pb add.', pbSub: 'pb sub.', pbMult: 'pb mult.', pbDiv: 'pb partage', pbPct: 'pb %',
  };
  return map[k] || k;
}

/* ============================================================
   BOUTIQUE — accessoires achetables avec des pièces 💰
   Conversion : 10 XP = 1 pièce
   ============================================================ */

function coinsFor(profile) {
  // Pièces = (XP total) / 10 - dépenses cumulées
  const earned = Math.floor((profile.xp || 0) / 10);
  const spent = profile.coinsSpent || 0;
  return earned - spent;
}

function ownedShopItems(profile) {
  return profile.shop || [];
}

function isOwned(profile, itemId) {
  return ownedShopItems(profile).includes(itemId);
}

function equippedItem(profile, type) {
  const eq = profile.shopEquipped || {};
  return eq[type] || null;
}

function buyShopItem(profile, item) {
  if (isOwned(profile, item.id)) return false;
  const balance = coinsFor(profile);
  if (balance < item.cost) return false;
  profile.coinsSpent = (profile.coinsSpent || 0) + item.cost;
  profile.shop = profile.shop || [];
  profile.shop.push(item.id);
  // Auto-équipement à l'achat
  profile.shopEquipped = profile.shopEquipped || {};
  profile.shopEquipped[item.type] = item.id;
  saveData();
  return true;
}

function equipShopItem(profile, item) {
  if (!isOwned(profile, item.id)) return false;
  profile.shopEquipped = profile.shopEquipped || {};
  if (profile.shopEquipped[item.type] === item.id) {
    delete profile.shopEquipped[item.type]; // re-clic = déséquiper
  } else {
    profile.shopEquipped[item.type] = item.id;
  }
  // Si c'est un thème, applique-le immédiatement
  if (item.type === 'theme') applyTheme(profile);
  saveData();
  return true;
}

function applyTheme(profile) {
  const themeId = equippedItem(profile, 'theme');
  if (themeId && SHOP_THEMES[themeId]) {
    document.body.style.background = SHOP_THEMES[themeId].bg;
    document.body.style.backgroundAttachment = 'fixed';
    document.documentElement.style.setProperty('--accent', SHOP_THEMES[themeId].accent);
  } else {
    document.body.style.background = '';
    document.documentElement.style.removeProperty('--accent');
  }
}

function showShop() {
  const p = state.current;
  if (!p) return;
  document.getElementById('coinsBalance').textContent = `💰 ${coinsFor(p)}`;
  const intro = document.getElementById('shopIntro');
  intro.innerHTML = `
    Convertis ton XP en pièces 💰 et achète des accessoires, thèmes et stickers !<br>
    <b>10 XP = 1 pièce</b>. Tu as <b>${coinsFor(p)} 💰</b> à dépenser.
  `;
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  // Grouper par type
  const types = { hat: '🎩 Chapeaux', access: '🎀 Accessoires', sticker: '✨ Stickers', theme: '🎨 Thèmes' };
  Object.entries(types).forEach(([type, label]) => {
    const items = SHOP_ITEMS.filter(i => i.type === type);
    const header = document.createElement('div');
    header.style.cssText = 'grid-column:1/-1;font-size:14px;font-weight:800;color:var(--accent);margin:8px 0 4px';
    header.textContent = label;
    grid.appendChild(header);
    items.forEach(item => {
      const owned = isOwned(p, item.id);
      const equipped = equippedItem(p, item.type) === item.id;
      const balance = coinsFor(p);
      const affordable = balance >= item.cost;
      const card = document.createElement('div');
      card.className = 'shop-item' + (owned ? ' owned' : '') + (equipped ? ' equipped' : '') + (!owned && !affordable ? ' unaffordable' : '');
      card.innerHTML = `
        <span class="emoji">${item.emoji}</span>
        <div class="name">${escapeHTML(item.name)}</div>
        <div class="price">${owned ? (equipped ? '✓ Équipé' : 'Cliquer') : '💰 ' + item.cost}</div>
      `;
      card.onclick = () => {
        if (owned) {
          equipShopItem(p, item);
          buzzTap();
          showShop(); // refresh
          flash(equipped ? `${item.name} : retiré` : `${item.name} : équipé !`);
        } else {
          if (balance < item.cost) {
            flash(`Il te manque ${item.cost - balance} 💰`);
            return;
          }
          if (confirm(`Acheter ${item.name} pour ${item.cost} 💰 ?\n\nIl te restera ${balance - item.cost} 💰.`)) {
            buyShopItem(p, item);
            sndLevel(); confetti(20); buzzTrophy();
            showShop();
            flash(`${item.name} acheté !`);
          }
        }
      };
      grid.appendChild(card);
    });
  });
  showScreen('screen-shop');
}

/* Étend avatarHTML pour afficher l'item équipé en plus de l'accessoire de niveau */
const _origAvatarHTML = avatarHTML;
avatarHTML = function(profile) {
  const lvl = levelFor(profile.xp).level;
  const acc = accessoryFor(lvl);
  const equippedHat = equippedItem(profile, 'hat');
  const equippedAccess = equippedItem(profile, 'access');
  const equippedSticker = equippedItem(profile, 'sticker');
  const hatItem = SHOP_ITEMS.find(i => i.id === equippedHat);
  const accessItem = SHOP_ITEMS.find(i => i.id === equippedAccess);
  const stickerItem = SHOP_ITEMS.find(i => i.id === equippedSticker);
  let html = `<span class="av-with-acc">${profile.avatar}`;
  if (acc.emoji) html += `<span class="acc">${acc.emoji}</span>`;
  if (hatItem) html += `<span class="acc" style="top:-8px;right:auto;left:-4px">${hatItem.emoji}</span>`;
  if (accessItem) html += `<span class="acc" style="bottom:-2px;right:-12px">${accessItem.emoji}</span>`;
  if (stickerItem) html += `<span class="acc" style="top:0;left:50%;transform:translateX(-50%) translateY(-10px)">${stickerItem.emoji}</span>`;
  html += `</span>`;
  return html;
};

/* ============================================================
   WRAPPED — bilan du mois
   ============================================================ */
function showWrapped() {
  const p = state.current;
  if (!p) return;
  const now = new Date();
  const month = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  // Activité de ce mois
  const ym = now.toISOString().slice(0, 7);
  const monthActivity = Object.entries(p.activity || {})
    .filter(([k]) => k.startsWith(ym))
    .map(([,v]) => v);
  const days = monthActivity.length;
  const exos = monthActivity.reduce((s,a) => s + a.exos, 0);
  const correct = monthActivity.reduce((s,a) => s + a.correct, 0);
  const xp = monthActivity.reduce((s,a) => s + a.xp, 0);
  const min = Math.round(monthActivity.reduce((s,a) => s + a.seconds, 0) / 60);
  const accuracy = exos ? Math.round(correct / exos * 100) : 0;
  const newTrophies = Object.entries(p.trophies || {})
    .filter(([k, ts]) => {
      const d = new Date(ts);
      return d.toISOString().slice(0,7) === ym;
    }).length;

  // Best streak ever
  const bestStreak = p.streakBest || 0;
  // Top monde joué
  const fav = p.favTrick || 'Toutes les astuces';

  const cont = document.getElementById('wrappedContent');
  cont.innerHTML = `
    <div class="wrapped-card" id="wrappedCard">
      <h2>${escapeHTML(p.name)} en…</h2>
      <div class="wmonth">${month}</div>
      <div class="wav">${avatarHTML(p)}</div>
      <div class="wname">Niveau ${levelFor(p.xp).level} · ${rankFor(levelFor(p.xp).level).name}</div>
      <div class="wrapped-stats">
        <div class="ws"><b>${days}</b><span>jours joués</span></div>
        <div class="ws"><b>${exos}</b><span>calculs faits</span></div>
        <div class="ws"><b>${accuracy}%</b><span>réussite</span></div>
        <div class="ws"><b>${min}</b><span>minutes</span></div>
        <div class="ws"><b>+${xp}</b><span>XP gagnés</span></div>
        <div class="ws"><b>${newTrophies}</b><span>nouveaux trophées</span></div>
      </div>
      <div class="wrapped-fav">
        <small>Astuce favorite</small>
        <b>${fav}</b>
      </div>
      <div class="wrapped-fav" style="background:rgba(76, 201, 240, 0.15);border-color:rgba(76, 201, 240, 0.4)">
        <small>Meilleur combo</small>
        <b>🔥 ${bestStreak} d'affilée</b>
      </div>
    </div>
    <button class="btn btn-primary" id="btnShareWrapped">📤 Partager (texte)</button>
    <button class="btn btn-secondary" id="btnDownloadWrapped" style="margin-top:10px">📷 Télécharger l'image</button>
    <p style="font-size:12px;color:var(--text-soft);text-align:center;margin-top:14px">Envoie le bilan aux grands-parents !</p>
  `;
  showScreen('screen-wrapped');

  document.getElementById('btnShareWrapped').onclick = () => {
    const text = `🎁 ${p.name} en ${month} sur Calastu !\n\n📅 ${days} jours joués\n🧮 ${exos} calculs · ${accuracy}% de réussite\n⏱️ ${min} minutes\n🏆 ${newTrophies} nouveaux trophées\n🔥 Meilleur combo : ${bestStreak} d'affilée\n👑 Niveau ${levelFor(p.xp).level} - ${rankFor(levelFor(p.xp).level).name}\n\nCalastu — l'académie des as du calcul mental !`;
    if (navigator.share) {
      navigator.share({ title: `${p.name} sur Calastu`, text }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(() => flash('Texte copié ! Colle-le dans WhatsApp/SMS.')).catch(() => flash(text));
    }
  };
  document.getElementById('btnDownloadWrapped').onclick = downloadWrappedImage;
}

function downloadWrappedImage() {
  // Capture la wrapped card en image via SVG → PNG
  const card = document.getElementById('wrappedCard');
  const html = card.outerHTML;
  // Méthode simple : SVG foreignObject
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff">
        ${html}
      </div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Calastu_${state.current.name}.svg`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  flash('Image SVG téléchargée !');
}

/* ============================================================
   NOTIFICATIONS — rappels quotidiens
   ============================================================ */
function updateNotifStatus() {
  const el = document.getElementById('notifStatus');
  if (!el) return;
  if (!('Notification' in window)) {
    el.textContent = 'Non supporté sur cet appareil.';
    return;
  }
  if (Notification.permission === 'granted') {
    el.textContent = '✅ Activé. Rappel à 17h chaque jour.';
    scheduleNotificationCheck();
  } else if (Notification.permission === 'denied') {
    el.textContent = '❌ Bloqué. Active dans les réglages du navigateur.';
  } else {
    el.textContent = 'Pas encore activé.';
  }
}

function enableNotifications() {
  if (!('Notification' in window)) {
    flash('Non supporté sur cet appareil');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      flash('🔔 Rappels activés !');
      // Test imédiat
      try { new Notification('Calastu', { body: 'Rappels activés ! Tu recevras un message chaque jour à 17h.', icon: 'icon-192.png' }); } catch(e) {}
      scheduleNotificationCheck();
    } else {
      flash('Permission refusée');
    }
    updateNotifStatus();
  });
}

/* Choisit une "astuce oubliée" pour rappel personnalisé */
function pickForgottenSkill(profile) {
  const skills = profile.skills || {};
  const candidates = Object.entries(skills)
    .filter(([k, s]) => {
      if (s.seen < 5) return false;
      // Vue il y a au moins 5 jours
      const days = (Date.now() - (s.lastSeen || 0)) / 86400000;
      if (days < 5) return false;
      // Et qui était bien acquise (box >= 3)
      return (s.box || 1) >= 3;
    })
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  return candidates.length > 0 ? candidates[0][0] : null;
}

function trickRecallMessage(drillKey) {
  const examples = {
    x9: 'Tu te souviens du truc des ×9 ? Essaye 47 × 9 !',
    x11: 'Le truc des ×11 te dit quelque chose ? Tente 35 × 11 !',
    x25_50: '×25 = ×100÷4. Toujours dans tes réflexes ?',
    x5: '×5 = ×10÷2 — viens vérifier que c\'est toujours automatique !',
    compl100: 'Compléments à 100 : 47 + ? Tu sais ?',
    x01: 'Multiplier par 0,1 c\'est diviser par... viens revoir !',
    carre5: 'Le truc des carrés en 5 (35², 75²...) t\'attend !',
    fracSimplify: 'Simplification de fractions : à reprendre avant l\'oubli !',
  };
  return examples[drillKey] || 'Une astuce s\'efface — viens la rafraîchir !';
}

let notifCheckInterval = null;
function scheduleNotificationCheck() {
  if (notifCheckInterval) return;
  notifCheckInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() !== 17 || now.getMinutes() >= 30) return;
    if (Notification.permission !== 'granted') return;
    const today = now.toISOString().slice(0, 10);
    state.data.profiles.forEach(p => {
      if (p.lastPlayDay === today) return;
      // Choix du message : si une astuce est oubliée, on la cible. Sinon streak.
      const forgotten = pickForgottenSkill(p);
      let body;
      if (forgotten) {
        body = trickRecallMessage(forgotten);
      } else if ((p.dayStreak || 0) >= 2) {
        body = `Tu as un streak de ${p.dayStreak} jour${p.dayStreak>1?'s':''} 🔥 — viens jouer pour le garder !`;
      } else {
        const due = dueSkills(p).length;
        if (due > 0) body = `${due} astuce${due>1?'s':''} à réviser t\'attend${due>1?'ent':''} 🎯`;
        else body = 'C\'est l\'heure de ton entraînement quotidien ! 🧠';
      }
      try {
        new Notification(`Calastu — ${p.name}`, {
          body, icon: 'icon-192.png',
          tag: `calastu-${p.id}-${today}`,
        });
      } catch(e) {}
    });
  }, 30 * 60 * 1000);
}

/* ---------- Plein écran (Fullscreen API) ---------- */
function toggleFullscreen() {
  const doc = document;
  const elem = document.documentElement;
  const isFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  if (isFullscreen) {
    if (doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  } else {
    if (elem.requestFullscreen) elem.requestFullscreen({ navigationUI: 'hide' }).catch(()=>flash('Plein écran non supporté'));
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else flash('Pour le plein écran, installe l\'app : Menu ⋮ → Installer l\'application');
  }
}

function showConfirm(title, text, onYes) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  const m = document.getElementById('modalConfirm');
  m.classList.add('show');
  document.getElementById('btnConfirmCancel').onclick = () => m.classList.remove('show');
  document.getElementById('btnConfirmOk').onclick = () => {
    m.classList.remove('show');
    onYes();
  };
}
