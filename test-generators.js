/* ============================================================
   CALASTU — Validation INDÉPENDANTE des générateurs
   Pour chaque exercice généré, on parse la question et on calcule
   la réponse SANS utiliser le générateur. Si ça matche, le
   générateur est fiable. Si ça matche PAS, on a un bug à fixer.

   Usage : node test-generators.js
   Le script échoue (exit 1) en cas de divergence.
   ============================================================ */

global.window = {};
global.document = { addEventListener: () => {} };
require('./exercises.js');

const W = window.WORLDS;

function parseAndEvaluate(question) {
  // Normalise : virgule décimale française → point, supprime espaces
  let q = question.replace(/,/g, '.').replace(/\s+/g, '');

  // Cas "n + ? = m" : on cherche m - n
  let m = q.match(/^(-?\d+(?:\.\d+)?)\+\?=(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[2]) - parseFloat(m[1]);

  // Cas "n + n + ? = total" : total - sum
  m = q.match(/^(-?\d+(?:\.\d+)?)\+(-?\d+(?:\.\d+)?)\+\?=(-?\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[3]) - parseFloat(m[1]) - parseFloat(m[2]);

  // Cas "Simplifie a/b" (fraction)
  m = q.match(/^Simplifie(\d+)\/(\d+)$/);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    return a / b;
  }

  // Cas "a/b × n" ou "a × b/c" ou "n ÷ a/b" : on remplace puis évalue
  // Cas problèmes (texte) : on rejette ces vérifications (couvert ailleurs)
  if (/[a-zA-Z]/.test(q.replace(/[÷×−+\d\.\(\)\/=?]/g, ''))) {
    return null; // contient du texte, on skip
  }

  // Pourcentages : "p%de n" → p * n / 100
  m = q.match(/^(\d+(?:\.\d+)?)%de(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) * parseFloat(m[2]) / 100;

  // Cas spécial : "n ÷ a/b" → on calcule directement (astuce ×inverse)
  // Pattern strict : un nombre, ÷, fraction simple, RIEN D'AUTRE
  let mDF = q.match(/^(\d+(?:\.\d+)?)÷(\d+)\/(\d+)$/);
  if (mDF) {
    const n = parseFloat(mDF[1]), a = parseFloat(mDF[2]), b = parseFloat(mDF[3]);
    return n / (a / b);
  }

  // Cas spécial : "(a × b × c) / (d × e × f)" — produit sur produit
  let mProd = q.match(/^\((.+)\)\/\((.+)\)$/);
  if (mProd) {
    const num = mProd[1].replace(/×/g, '*');
    const den = mProd[2].replace(/×/g, '*');
    if (/^[\d*\s.]+$/.test(num) && /^[\d*\s.]+$/.test(den)) {
      try {
        const n = Function('"use strict";return (' + num + ')')();
        const d = Function('"use strict";return (' + den + ')')();
        return n / d;
      } catch(e) {}
    }
  }

  // Cas "k/d × n" : fraction × nombre
  let mFM = q.match(/^(\d+)\/(\d+)×(\d+(?:\.\d+)?)$/);
  if (mFM) return (parseFloat(mFM[1]) / parseFloat(mFM[2])) * parseFloat(mFM[3]);

  // Conversion des opérateurs (cas générique gauche-à-droite)
  let expr = q
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');

  // Si la chaîne contient des fractions a/b dans une multiplication, on évalue avec eval safe
  // (uniquement chiffres, opérateurs, parenthèses, points)
  if (!/^[-+*\/().\d ]+$/.test(expr)) return null;

  try {
    // eslint-disable-next-line no-eval
    const res = Function('"use strict";return (' + expr + ')')();
    return res;
  } catch (e) {
    return null;
  }
}

let total = 0;
let skipped = 0;
let mismatches = 0;
const issues = [];

for (const w of W) {
  for (const stage of w.stages) {
    if (!stage.gen) continue;
    for (let i = 0; i < 30; i++) {
      total++;
      let ex;
      try { ex = stage.gen(); } catch(e) {
        mismatches++;
        issues.push({ world: w.name, stage: stage.name, error: 'crash: ' + e.message });
        continue;
      }
      const computed = parseAndEvaluate(ex.question);
      if (computed === null) {
        skipped++;
        continue;
      }
      // Compare avec la réponse du générateur
      const expected = ex.answer;
      if (Math.abs(computed - expected) > 1e-6) {
        mismatches++;
        issues.push({
          world: w.name,
          stage: stage.name,
          question: ex.question,
          generated: expected,
          computed,
          diff: computed - expected,
        });
        if (issues.length > 30) break; // limite l'output
      }
    }
    if (issues.length > 30) break;
  }
  if (issues.length > 30) break;
}

console.log(`\n📊 Calastu — Validation des générateurs`);
console.log(`Tests effectués : ${total}`);
console.log(`Skip (problèmes textuels) : ${skipped}`);
console.log(`Vérifiés : ${total - skipped}`);
console.log(`Divergences : ${mismatches}`);

/* ============================================================
   TEST PÉDAGOGIQUE — détection des cas où l'astuce proposée
   N'EST PAS la plus rapide pour le nombre généré
   ============================================================ */
console.log('\n📚 Audit pédagogique des stages...');
const pedagogicalIssues = [];

function isNearRound(n, ...rounds) {
  return rounds.some(r => Math.abs(n - r) <= 4);
}

const COMMON_ROUNDS = [25, 50, 75, 100, 150, 200];

// Règles : pour chaque stage, on vérifie que le nombre tiré n'est pas dans
// la zone d'application d'une autre astuce plus rapide
const RULES = {
  // Stage ×4 ou ×8 : si n proche de 25/50/100, la compensation est mieux
  x4_8: (q) => {
    const m = q.match(/^(\d+)\s*×\s*[48]$/);
    if (!m) return null;
    const n = parseInt(m[1]);
    const near = COMMON_ROUNDS.find(r=>Math.abs(n-r)<=4);
    if (near) return `n=${n} : compensation autour de ${near} serait plus rapide`;
    return null;
  },
  x9: (q) => {
    const m = q.match(/^(\d+)\s*×\s*9$/);
    if (!m) return null;
    const n = parseInt(m[1]);
    const near = COMMON_ROUNDS.find(r=>Math.abs(n-r)<=4);
    if (near) return `n=${n} : compensation autour de ${near} serait plus rapide`;
    return null;
  },
  x5: (q) => {
    const m = q.match(/^(\d+)\s*×\s*5$/);
    if (!m) return null;
    const n = parseInt(m[1]);
    const near = COMMON_ROUNDS.find(r=>Math.abs(n-r)<=4);
    if (near) return `n=${n} : compensation autour de ${near} serait plus rapide que ×10÷2`;
    return null;
  },
  x50: (q) => {
    const m = q.match(/^(\d+)\s*×\s*50$/);
    if (!m) return null;
    const n = parseInt(m[1]);
    if (isNearRound(n, 100, 200)) return `n=${n} proche d'un rond : compensation mieux`;
    return null;
  },
};

for (const w of W) {
  for (const stage of w.stages) {
    if (!stage.gen) continue;
    const ruleKey = stage.drillKey;
    const rule = RULES[ruleKey];
    if (!rule) continue;
    for (let i = 0; i < 50; i++) {
      const ex = stage.gen();
      const issue = rule(ex.question);
      if (issue) {
        pedagogicalIssues.push({ world: w.name, stage: stage.name, q: ex.question, issue });
        if (pedagogicalIssues.length > 20) break;
      }
    }
    if (pedagogicalIssues.length > 20) break;
  }
  if (pedagogicalIssues.length > 20) break;
}

if (pedagogicalIssues.length > 0) {
  console.log('\n⚠️  ISSUES PÉDAGOGIQUES DÉTECTÉES :');
  pedagogicalIssues.slice(0, 15).forEach(p => {
    console.log(`  [${p.world} / ${p.stage}] ${p.q} — ${p.issue}`);
  });
} else {
  console.log('✅ Aucune incohérence pédagogique détectée.');
}

if (mismatches > 0) {
  console.log('\n❌ DIVERGENCES TROUVÉES :');
  issues.forEach(it => {
    if (it.error) {
      console.log(`  CRASH ${it.world} / ${it.stage} : ${it.error}`);
    } else {
      console.log(`  ${it.world} / ${it.stage}`);
      console.log(`    Question : ${it.question}`);
      console.log(`    Générateur : ${it.generated}`);
      console.log(`    Calcul indépendant : ${it.computed}`);
      console.log(`    Δ = ${it.diff}`);
    }
  });
  process.exit(1);
} else {
  console.log('\n✅ TOUS LES GÉNÉRATEURS SONT FIABLES.');
  process.exit(0);
}
