/* ============================================================
   CALASTU JUNIOR — Banque d'exercices et leçons (6 à 8 ans)
   Adaptée pour CP / CE1 / CE2 (transition).
   Chaque "monde" a :
     - id, name, emoji, description, color
     - lesson : HTML pédagogique (langage très simple)
     - stages : tableau de niveaux. Chaque stage a un générateur.
   Un exercice généré = { question, answer, trick, explanation, label }
   ============================================================ */

/* ===== Helpers ===== */
const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

// Format un nombre — pour Junior tout est entier
function fmt(n) {
  return Math.round(n).toString();
}

// Compare réponse user (string) à valeur attendue (number)
function answerEquals(userStr, expected) {
  if (userStr == null) return false;
  const s = userStr.replace(',', '.').trim();
  if (s === '' || s === '-' || s === '.') return false;
  const n = Number(s);
  if (isNaN(n)) return false;
  return Math.abs(n - expected) < 1e-6;
}

/* ============================================================
   GÉNÉRATEURS — chaque fonction retourne un exercice
   ============================================================ */

/* ---------- MONDE 1 : LES NOMBRES ---------- */

function gen_count_dots() {
  const n = rng(3, 12);
  const dots = '🔵'.repeat(n);
  return {
    question: `Combien ?<br><span class="big-emoji">${dots}</span>`,
    answer: n,
    trick: "Compter",
    explanation: `<b>On compte un par un :</b><br>
      <span class="step">1, 2, 3... ${n} !</span>
      <span class="step">Il y en a <b>${n}</b></span>`
  };
}

function gen_count_groups() {
  // groupes de 5 + reste (jusqu'à 30)
  const groups = rng(2, 5);
  const rest = rng(0, 4);
  const n = groups * 5 + rest;
  const display = '🟢🟢🟢🟢🟢 '.repeat(groups) + '🔵'.repeat(rest);
  return {
    question: `Combien ?<br><span class="big-emoji">${display.trim()}</span>`,
    answer: n,
    trick: "Compter par paquets",
    explanation: `<b>Astuce :</b> on compte les paquets de 5, puis le reste.<br>
      <span class="step">${groups} paquets de 5 = ${groups * 5}</span>
      ${rest > 0 ? `<span class="step">+ ${rest} en plus = <b>${n}</b></span>` : `<span class="step">= <b>${n}</b></span>`}`
  };
}

function gen_compare() {
  let a = rng(1, 99), b = rng(1, 99);
  while (a === b) b = rng(1, 99);
  const bigger = Math.max(a, b);
  return {
    question: `Le plus grand : ${a} ou ${b} ?`,
    answer: bigger,
    trick: "Comparer",
    explanation: `<b>Astuce :</b> on regarde d'abord les <b>dizaines</b>.<br>
      <span class="step">${a} a ${Math.floor(a/10)} dizaine(s), ${b} a ${Math.floor(b/10)} dizaine(s)</span>
      <span class="step">Le plus grand est <b>${bigger}</b></span>`
  };
}

function gen_next() {
  const n = rng(1, 99);
  return {
    question: `Quel nombre vient juste après ${n} ?`,
    answer: n + 1,
    trick: "Le suivant",
    explanation: `<b>Astuce :</b> "juste après" = on ajoute 1.<br>
      <span class="step">${n} + 1 = <b>${n + 1}</b></span>`
  };
}

function gen_prev() {
  const n = rng(2, 99);
  return {
    question: `Quel nombre vient juste avant ${n} ?`,
    answer: n - 1,
    trick: "Le précédent",
    explanation: `<b>Astuce :</b> "juste avant" = on enlève 1.<br>
      <span class="step">${n} − 1 = <b>${n - 1}</b></span>`
  };
}

function gen_decompose_du() {
  const d = rng(1, 9);
  const u = rng(1, 9);
  return {
    question: `${d} dizaines et ${u} unités = ?`,
    answer: d * 10 + u,
    trick: "Dizaines + unités",
    explanation: `<b>Astuce :</b> 1 dizaine = 10.<br>
      <span class="step">${d} dizaines = ${d}0</span>
      <span class="step">${d}0 + ${u} = <b>${d * 10 + u}</b></span>`
  };
}

function gen_numbers_mix() {
  return pick([gen_count_dots, gen_count_groups, gen_compare, gen_next, gen_prev, gen_decompose_du])();
}

/* ---------- MONDE 2 : ADDITIONS MAGIQUES ---------- */

function gen_add_small() {
  const a = rng(1, 5);
  const b = rng(1, 5);
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Petite addition",
    explanation: `<b>On compte sur ses doigts si besoin :</b><br>
      <span class="step">${a} + ${b} = <b>${a + b}</b></span>`
  };
}

function gen_add_to10() {
  const a = rng(1, 9);
  const b = rng(1, 10 - a);
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Addition jusqu'à 10",
    explanation: `<b>On part de ${a} et on ajoute ${b} :</b><br>
      <span class="step">${a} + ${b} = <b>${a + b}</b></span>`
  };
}

function gen_add_to20() {
  const a = rng(2, 9);
  const b = rng(2, 9);
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Addition jusqu'à 20",
    explanation: `<b>Astuce :</b> on part du plus grand et on saute.<br>
      <span class="step">${Math.max(a,b)} + ${Math.min(a,b)} = <b>${a + b}</b></span>`
  };
}

function gen_add_tens() {
  const a = rng(1, 8) * 10;
  const b = rng(1, 9 - a/10) * 10;
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Dizaines entières",
    explanation: `<b>Astuce :</b> on additionne juste les dizaines.<br>
      <span class="step">${a/10} + ${b/10} = ${(a+b)/10}</span>
      <span class="step">Donc ${a} + ${b} = <b>${a + b}</b></span>`
  };
}

function gen_add_du() {
  const d = rng(1, 8) * 10;
  const u = rng(1, 9);
  return {
    question: `${d} + ${u}`,
    answer: d + u,
    trick: "Dizaine + unité",
    explanation: `<b>Astuce :</b> on colle juste l'unité à la dizaine.<br>
      <span class="step">${d} + ${u} = <b>${d + u}</b></span>`
  };
}

function gen_add_passage10() {
  // a + b > 10, a et b ≤ 9 — passage de la dizaine
  const a = rng(5, 9);
  const b = rng(11 - a, 9);
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Passage de la dizaine",
    explanation: `<b>Astuce :</b> on complète d'abord à 10.<br>
      <span class="step">${a} + ${10 - a} = 10</span>
      <span class="step">Il reste ${b} − ${10 - a} = ${b - (10 - a)}</span>
      <span class="step">10 + ${b - (10 - a)} = <b>${a + b}</b></span>`
  };
}

function gen_add_2digits_simple() {
  // ab + c (c < 10, pas de retenue)
  const d = rng(1, 8) * 10;
  const u = rng(1, 5);
  const c = rng(1, 9 - u);
  return {
    question: `${d + u} + ${c}`,
    answer: d + u + c,
    trick: "2 chiffres + 1",
    explanation: `<b>Astuce :</b> on ajoute juste aux unités.<br>
      <span class="step">${u} + ${c} = ${u + c}</span>
      <span class="step">${d} + ${u + c} = <b>${d + u + c}</b></span>`
  };
}

function gen_add_mix() {
  return pick([gen_add_to10, gen_add_to20, gen_add_tens, gen_add_du, gen_add_passage10, gen_add_2digits_simple])();
}

/* ---------- MONDE 3 : SOUSTRACTIONS ---------- */

function gen_sub_small() {
  const a = rng(3, 9);
  const b = rng(1, a - 1);
  return {
    question: `${a} − ${b}`,
    answer: a - b,
    trick: "Petite soustraction",
    explanation: `<b>On enlève :</b><br>
      <span class="step">${a} − ${b} = <b>${a - b}</b></span>`
  };
}

function gen_sub_to10() {
  const a = rng(5, 10);
  const b = rng(1, a - 1);
  return {
    question: `${a} − ${b}`,
    answer: a - b,
    trick: "Soustraction ≤ 10",
    explanation: `<b>Astuce :</b> on part de ${a} et on recule de ${b}.<br>
      <span class="step">${a} − ${b} = <b>${a - b}</b></span>`
  };
}

function gen_sub_to20() {
  const a = rng(11, 20);
  const b = rng(2, 9);
  return {
    question: `${a} − ${b}`,
    answer: a - b,
    trick: "Soustraction ≤ 20",
    explanation: `<b>Astuce :</b> on passe par 10.<br>
      <span class="step">${a} − ${a - 10} = 10</span>
      <span class="step">10 − ${b - (a - 10)} = <b>${a - b}</b></span>`
  };
}

function gen_sub_tens() {
  const a = rng(4, 9) * 10;
  const b = rng(1, a/10 - 1) * 10;
  return {
    question: `${a} − ${b}`,
    answer: a - b,
    trick: "Dizaines entières",
    explanation: `<b>Astuce :</b> on enlève juste les dizaines.<br>
      <span class="step">${a/10} − ${b/10} = ${(a-b)/10}</span>
      <span class="step">Donc ${a} − ${b} = <b>${a - b}</b></span>`
  };
}

function gen_sub_du() {
  const d = rng(2, 9) * 10;
  const u = rng(1, 9);
  return {
    question: `${d + u} − ${u}`,
    answer: d,
    trick: "Enlever les unités",
    explanation: `<b>Astuce :</b> on enlève juste les unités, la dizaine reste.<br>
      <span class="step">${d + u} − ${u} = <b>${d}</b></span>`
  };
}

function gen_sub_mix() {
  return pick([gen_sub_to10, gen_sub_to20, gen_sub_tens, gen_sub_du])();
}

/* ---------- MONDE 4 : LES AMIS DE 10 ---------- */

function gen_friend10() {
  const a = rng(1, 9);
  return {
    question: `${a} + ? = 10`,
    answer: 10 - a,
    trick: "Amis de 10",
    explanation: `<b>À retenir par cœur !</b><br>
      <span class="step">1+9 · 2+8 · 3+7 · 4+6 · 5+5</span>
      <span class="step">${a} + <b>${10 - a}</b> = 10</span>`
  };
}

function gen_friend10_reverse() {
  const a = rng(1, 9);
  return {
    question: `? + ${a} = 10`,
    answer: 10 - a,
    trick: "Amis de 10",
    explanation: `<b>Cherche l'ami de ${a} :</b><br>
      <span class="step"><b>${10 - a}</b> + ${a} = 10</span>`
  };
}

function gen_friend20() {
  const a = rng(11, 19);
  return {
    question: `${a} + ? = 20`,
    answer: 20 - a,
    trick: "Amis de 20",
    explanation: `<b>Astuce :</b> 20 = 10 + 10.<br>
      <span class="step">Il manque ${20 - a} pour arriver à 20</span>
      <span class="step">${a} + <b>${20 - a}</b> = 20</span>`
  };
}

function gen_friend_round() {
  // ex: ? + 7 = 30 (compléter à la dizaine la plus proche)
  const tens = rng(2, 9) * 10;
  const u = rng(1, 9);
  const n = tens - u;
  return {
    question: `${n} + ? = ${tens}`,
    answer: u,
    trick: "Compléter à la dizaine",
    explanation: `<b>Astuce :</b> regarde l'ami de l'unité.<br>
      <span class="step">${n} a ${10 - u} comme unité ? Non : ${n%10} (rappel : 10 − ${u} = ${10-u})</span>
      <span class="step">${n} + <b>${u}</b> = ${tens}</span>`
  };
}

function gen_friend_mix() {
  return pick([gen_friend10, gen_friend10_reverse, gen_friend20, gen_friend_round])();
}

/* ---------- MONDE 5 : DOUBLES & MOITIÉS ---------- */

function gen_double_small() {
  const a = rng(1, 10);
  return {
    question: `Double de ${a} ?`,
    answer: a * 2,
    trick: "Doubles",
    explanation: `<b>Doubler = ajouter le même nombre.</b><br>
      <span class="step">${a} + ${a} = <b>${a * 2}</b></span>`
  };
}

function gen_double_med() {
  const a = rng(11, 25);
  return {
    question: `Double de ${a} ?`,
    answer: a * 2,
    trick: "Doubles plus grands",
    explanation: `<b>Astuce :</b> on double les dizaines, puis les unités.<br>
      <span class="step">Double de ${Math.floor(a/10)*10} = ${Math.floor(a/10)*20}</span>
      <span class="step">Double de ${a%10} = ${(a%10)*2}</span>
      <span class="step">Total : <b>${a * 2}</b></span>`
  };
}

function gen_half_small() {
  const a = rng(1, 10) * 2;
  return {
    question: `Moitié de ${a} ?`,
    answer: a / 2,
    trick: "Moitiés",
    explanation: `<b>Moitié = on partage en 2 parts égales.</b><br>
      <span class="step">${a/2} + ${a/2} = ${a}</span>
      <span class="step">Donc moitié de ${a} = <b>${a/2}</b></span>`
  };
}

function gen_half_tens() {
  const a = rng(2, 5) * 20;
  return {
    question: `Moitié de ${a} ?`,
    answer: a / 2,
    trick: "Moitié des dizaines",
    explanation: `<b>Astuce :</b> on prend la moitié des dizaines.<br>
      <span class="step">Moitié de ${a/10} = ${a/20}</span>
      <span class="step">Donc moitié de ${a} = <b>${a/2}</b></span>`
  };
}

function gen_doubles_mix() {
  return pick([gen_double_small, gen_double_med, gen_half_small, gen_half_tens])();
}

/* ---------- MONDE 6 : COMPTER EN SAUTANT ---------- */

function gen_skip2() {
  const start = rng(0, 10) * 2;
  const steps = rng(2, 4);
  return {
    question: `${start}, ${start+2}, ${start+4}, ... après ${steps} sauts ?`,
    answer: start + 2 * steps,
    trick: "Sauter de 2 en 2",
    explanation: `<b>Astuce :</b> chaque saut = +2.<br>
      <span class="step">${steps} sauts × 2 = ${steps * 2}</span>
      <span class="step">${start} + ${steps * 2} = <b>${start + 2 * steps}</b></span>`
  };
}

function gen_skip5() {
  const start = rng(0, 10) * 5;
  const steps = rng(2, 4);
  return {
    question: `${start}, ${start+5}, ${start+10}, ... après ${steps} sauts ?`,
    answer: start + 5 * steps,
    trick: "Sauter de 5 en 5",
    explanation: `<b>Astuce :</b> chaque saut = +5.<br>
      <span class="step">${steps} sauts × 5 = ${steps * 5}</span>
      <span class="step">${start} + ${steps * 5} = <b>${start + 5 * steps}</b></span>`
  };
}

function gen_skip10() {
  const start = rng(0, 8) * 10;
  const steps = rng(2, 5);
  return {
    question: `${start}, ${start+10}, ${start+20}, ... après ${steps} sauts ?`,
    answer: start + 10 * steps,
    trick: "Sauter de 10 en 10",
    explanation: `<b>Astuce :</b> chaque saut = +10.<br>
      <span class="step">${steps} sauts × 10 = ${steps * 10}</span>
      <span class="step">${start} + ${steps * 10} = <b>${start + 10 * steps}</b></span>`
  };
}

function gen_plus10() {
  const a = rng(5, 89);
  return {
    question: `${a} + 10`,
    answer: a + 10,
    trick: "+10",
    explanation: `<b>Astuce :</b> +10, c'est juste <b>+1 dizaine</b>.<br>
      <span class="step">${a} → ${a + 10}</span>`
  };
}

function gen_minus10() {
  const a = rng(15, 99);
  return {
    question: `${a} − 10`,
    answer: a - 10,
    trick: "−10",
    explanation: `<b>Astuce :</b> −10, c'est juste <b>−1 dizaine</b>.<br>
      <span class="step">${a} → ${a - 10}</span>`
  };
}

function gen_skip_mix() {
  return pick([gen_skip2, gen_skip5, gen_skip10, gen_plus10, gen_minus10])();
}

/* ---------- MONDE 7 : TABLES FACILES ---------- */

function gen_table2() {
  const n = rng(1, 10);
  return {
    question: `${n} × 2`,
    answer: n * 2,
    trick: "Table de 2",
    explanation: `<b>Table de 2 = doubler.</b><br>
      <span class="step">${n} + ${n} = <b>${n * 2}</b></span>`
  };
}

function gen_table5() {
  const n = rng(1, 10);
  return {
    question: `${n} × 5`,
    answer: n * 5,
    trick: "Table de 5",
    explanation: `<b>Astuce :</b> ${n} × 5 = compter de 5 en 5, ${n} fois.<br>
      <span class="step">5, 10, 15... → <b>${n * 5}</b></span>
      <span class="step">Petit truc : ça finit toujours par 0 ou 5 !</span>`
  };
}

function gen_table10() {
  const n = rng(1, 10);
  return {
    question: `${n} × 10`,
    answer: n * 10,
    trick: "Table de 10",
    explanation: `<b>Astuce :</b> ×10, on ajoute juste un <b>0</b>.<br>
      <span class="step">${n} × 10 = <b>${n * 10}</b></span>`
  };
}

function gen_table3() {
  const n = rng(1, 10);
  return {
    question: `${n} × 3`,
    answer: n * 3,
    trick: "Table de 3",
    explanation: `<b>Astuce :</b> ${n} × 3 = (${n} × 2) + ${n}.<br>
      <span class="step">${n} × 2 = ${n * 2}</span>
      <span class="step">${n * 2} + ${n} = <b>${n * 3}</b></span>`
  };
}

function gen_tables_mix() {
  return pick([gen_table2, gen_table5, gen_table10, gen_table3])();
}

/* ---------- MONDE 8 : DÉCOMPOSER ---------- */

function gen_decomp10() {
  const a = rng(11, 19);
  return {
    question: `${a} = 10 + ?`,
    answer: a - 10,
    trick: "Décomposer en 10 + reste",
    explanation: `<b>Astuce :</b> on coupe en dizaine + unités.<br>
      <span class="step">${a} = 10 + <b>${a - 10}</b></span>`
  };
}

function gen_decomp_du() {
  const d = rng(2, 9) * 10;
  const u = rng(1, 9);
  return {
    question: `${d + u} = ${d} + ?`,
    answer: u,
    trick: "Décomposer dizaine + unités",
    explanation: `<b>Astuce :</b> on cherche les unités.<br>
      <span class="step">${d + u} = ${d} + <b>${u}</b></span>`
  };
}

function gen_decomp_to_round() {
  // ex : 8 + ? = 10  pour faire un nombre rond
  const u = rng(1, 9);
  const target = 10;
  return {
    question: `${u} + ? = ${target}`,
    answer: target - u,
    trick: "Aller au rond",
    explanation: `<b>Astuce :</b> trouver l'ami pour faire 10.<br>
      <span class="step">${u} + <b>${target - u}</b> = ${target}</span>`
  };
}

function gen_decomp_double_use() {
  // 7 + 8 = 7 + 7 + 1 (utiliser doubles)
  const a = rng(3, 8);
  const b = a + 1;
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Astuce du double",
    explanation: `<b>Truc malin :</b> ${b} = ${a} + 1, donc on utilise le double.<br>
      <span class="step">${a} + ${a} = ${a * 2}</span>
      <span class="step">${a * 2} + 1 = <b>${a + b}</b></span>`
  };
}

function gen_decomp_mix() {
  return pick([gen_decomp10, gen_decomp_du, gen_decomp_to_round, gen_decomp_double_use])();
}

/* ---------- MONDE 9 : MIX BOSS ---------- */

function gen_mix_easy() {
  return pick([gen_add_to10, gen_friend10, gen_double_small, gen_table10, gen_plus10, gen_decomp10])();
}

function gen_mix_med() {
  return pick([gen_add_to20, gen_sub_to20, gen_table5, gen_table2, gen_double_med, gen_friend20, gen_skip5, gen_decomp_du])();
}

function gen_mix_hard() {
  return pick([gen_add_passage10, gen_sub_to20, gen_friend_round, gen_half_tens, gen_skip10, gen_table3, gen_compare, gen_add_2digits_simple])();
}

function gen_mix_boss() {
  return pick([gen_mix_easy, gen_mix_med, gen_mix_hard])();
}

/* ============================================================
   STRUCTURE DES MONDES
   ============================================================ */

const WORLDS = [
  /* ---- MONDE 1 ---- */
  {
    id: 'numbers',
    name: 'Les Nombres',
    emoji: '🔢',
    color: '#4cc9f0',
    description: "Apprends à compter, comparer et reconnaître les nombres jusqu'à 100. C'est la base de tout !",
    lesson: `
      <h3>🔢 Les Nombres</h3>
      <p>Les nombres servent à <strong>compter</strong> et à <strong>ranger</strong>.</p>

      <h4>👀 Compter</h4>
      <p>On compte un par un : 1, 2, 3, 4, 5...</p>
      <div class="ex"><b>Astuce :</b> quand il y en a beaucoup, on fait des paquets de 5 ou de 10 pour aller plus vite.</div>

      <h4>📊 Comparer</h4>
      <p>Pour savoir lequel est le plus grand, on regarde d'abord les <b>dizaines</b>.</p>
      <div class="ex"><b>Exemple :</b> 47 et 52 → 5 dizaines &gt; 4 dizaines, donc 52 est plus grand.</div>

      <h4>🚶 Le suivant et le précédent</h4>
      <ul>
        <li><b>Juste après</b> = +1 (après 23 → 24)</li>
        <li><b>Juste avant</b> = −1 (avant 23 → 22)</li>
      </ul>

      <h4>🧱 Dizaines et unités</h4>
      <p>Un nombre à 2 chiffres, c'est des <b>dizaines</b> (paquets de 10) + des <b>unités</b> (tout seuls).</p>
      <div class="ex"><b>Exemple :</b> 47 = 4 dizaines + 7 unités.</div>
    `,
    stages: [
      { name: 'Compter', desc: 'avec des points', count: 10, gen: gen_count_dots, drillKey: 'count' },
      { name: 'Compter par paquets', desc: 'paquets de 5', count: 10, gen: gen_count_groups, drillKey: 'countGrp' },
      { name: 'Le plus grand', desc: 'comparer', count: 12, gen: gen_compare, drillKey: 'compare' },
      { name: 'Le suivant', desc: 'juste après', count: 12, gen: gen_next, drillKey: 'next' },
      { name: 'Le précédent', desc: 'juste avant', count: 12, gen: gen_prev, drillKey: 'prev' },
      { name: 'Dizaines + unités', desc: 'décomposer', count: 12, gen: gen_decompose_du, drillKey: 'decompDU' },
      { name: 'Mix', desc: 'tout mélangé', count: 15, gen: gen_numbers_mix },
    ]
  },

  /* ---- MONDE 2 ---- */
  {
    id: 'add',
    name: 'Additions Magiques',
    emoji: '➕',
    color: '#ffd166',
    description: "Apprends à ajouter des petits nombres, puis des plus grands. Les additions deviennent un jeu !",
    lesson: `
      <h3>➕ Additions Magiques</h3>
      <p>Additionner = <strong>mettre ensemble</strong>.</p>

      <h4>🤲 Petites additions</h4>
      <p>Avec ses doigts, ou en comptant : 3 + 4 = 7.</p>

      <h4>🏃 Astuce : partir du plus grand</h4>
      <div class="ex"><b>Exemple :</b> 2 + 7 → on part de 7 et on ajoute 2 → 8, 9. Réponse : <b>9</b></div>

      <h4>🧱 Dizaines + unités</h4>
      <p>Pour 30 + 5, on colle juste : <b>35</b>.</p>
      <p>Pour 20 + 30, on additionne les dizaines : 2 + 3 = 5 → <b>50</b>.</p>

      <h4>🌉 Passage de la dizaine (le plus dur)</h4>
      <p>Pour 8 + 5, on passe par 10 :</p>
      <div class="ex">8 + <b>2</b> = 10 (on a utilisé 2 sur les 5)<br>
        Il reste 5 − 2 = 3<br>
        10 + 3 = <b>13</b></div>

      <h4>💡 Astuce malin</h4>
      <p>Si tu vois 7 + 8 : c'est presque le double de 7 !</p>
      <div class="ex">7 + 7 = 14, donc 7 + 8 = <b>15</b>.</div>
    `,
    stages: [
      { name: 'Tout petits', desc: 'jusqu\'à 10', count: 12, gen: gen_add_small, drillKey: 'addSmall' },
      { name: 'Sommes ≤ 10', desc: 'sans dépasser 10', count: 15, gen: gen_add_to10, drillKey: 'addTo10' },
      { name: 'Sommes ≤ 20', desc: 'jusqu\'à 20', count: 15, gen: gen_add_to20, drillKey: 'addTo20' },
      { name: 'Dizaines entières', desc: '20 + 30, 40 + 50...', count: 12, gen: gen_add_tens, drillKey: 'addTens' },
      { name: 'Dizaine + unité', desc: '30 + 5', count: 12, gen: gen_add_du, drillKey: 'addDU' },
      { name: 'Passer la dizaine', desc: '8 + 5, 7 + 6...', count: 15, gen: gen_add_passage10, drillKey: 'addPass' },
      { name: '⚡ Drill 30', desc: '30 additions d\'affilée', count: 30, gen: gen_add_mix, drill: true },
      { name: 'Mix additions', desc: 'tout mélangé', count: 15, gen: gen_add_mix },
    ]
  },

  /* ---- MONDE 3 ---- */
  {
    id: 'sub',
    name: 'Soustractions',
    emoji: '➖',
    color: '#ff6b9d',
    description: "Enlever, retirer, partir... Toutes les façons de soustraire pour devenir un pro.",
    lesson: `
      <h3>➖ Soustractions</h3>
      <p>Soustraire = <strong>enlever</strong>.</p>

      <h4>🤲 Petites soustractions</h4>
      <div class="ex">7 − 3 → on part de 7, on recule de 3 : 6, 5, 4. Réponse : <b>4</b></div>

      <h4>🌉 Passer par 10</h4>
      <p>Pour 13 − 5, on enlève d'abord 3 pour atteindre 10 :</p>
      <div class="ex">13 − 3 = 10<br>
        Il reste 5 − 3 = 2 à enlever<br>
        10 − 2 = <b>8</b></div>

      <h4>🧱 Dizaines entières</h4>
      <p>Pour 80 − 30, on soustrait les dizaines : 8 − 3 = 5 → <b>50</b>.</p>

      <h4>💡 Truc des unités</h4>
      <p>35 − 5 ? On enlève juste les unités → il reste les dizaines : <b>30</b>.</p>
    `,
    stages: [
      { name: 'Tout petits', desc: 'soustractions ≤ 10', count: 12, gen: gen_sub_small, drillKey: 'subSmall' },
      { name: 'Soustractions ≤ 10', desc: 'sans dépasser 10', count: 12, gen: gen_sub_to10, drillKey: 'subTo10' },
      { name: 'Soustractions ≤ 20', desc: 'passer par 10', count: 15, gen: gen_sub_to20, drillKey: 'subTo20' },
      { name: 'Dizaines entières', desc: '80 − 30', count: 12, gen: gen_sub_tens, drillKey: 'subTens' },
      { name: 'Enlever les unités', desc: '35 − 5', count: 12, gen: gen_sub_du, drillKey: 'subDU' },
      { name: '⚡ Drill 30', desc: '30 soustractions', count: 30, gen: gen_sub_mix, drill: true },
      { name: 'Mix soustractions', desc: 'tout mélangé', count: 15, gen: gen_sub_mix },
    ]
  },

  /* ---- MONDE 4 ---- */
  {
    id: 'friends10',
    name: 'Les Amis de 10',
    emoji: '🤝',
    color: '#06d6a0',
    description: "1+9, 2+8, 3+7... Connais tous les amis de 10 par cœur — c'est la super-arme du calcul !",
    lesson: `
      <h3>🤝 Les Amis de 10</h3>
      <p>Les amis de 10, ce sont les <strong>paires de nombres qui font 10</strong>.</p>

      <h4>📜 La liste à apprendre par cœur</h4>
      <ul>
        <li><b>0 + 10</b></li>
        <li><b>1 + 9</b></li>
        <li><b>2 + 8</b></li>
        <li><b>3 + 7</b></li>
        <li><b>4 + 6</b></li>
        <li><b>5 + 5</b></li>
      </ul>
      <div class="tip">💡 Connaître ces paires <b>par cœur</b>, c'est devenir <b>10 fois plus rapide</b> en calcul !</div>

      <h4>🚪 Les amis de 20</h4>
      <p>Pareil, mais avec 20 :</p>
      <div class="ex">15 + 5 = 20 · 13 + 7 = 20 · 11 + 9 = 20</div>

      <h4>🎯 Compléter à la dizaine</h4>
      <p>Pour 47 + ? = 50, on cherche l'ami de 7 (pour faire 10) → <b>3</b>.</p>
    `,
    stages: [
      { name: 'Amis de 10', desc: '? + ? = 10', count: 12, gen: gen_friend10, drillKey: 'friend10' },
      { name: 'Amis de 10 (sens 2)', desc: '? + n = 10', count: 12, gen: gen_friend10_reverse, drillKey: 'friend10rev' },
      { name: 'Amis de 20', desc: '? + ? = 20', count: 12, gen: gen_friend20, drillKey: 'friend20' },
      { name: 'Aller au rond', desc: 'compléter à 30, 40...', count: 12, gen: gen_friend_round, drillKey: 'friendRound' },
      { name: '⚡ Drill 30', desc: '30 amis de 10', count: 30, gen: gen_friend10, drill: true },
      { name: 'Mix amis', desc: 'tout mélangé', count: 12, gen: gen_friend_mix },
    ]
  },

  /* ---- MONDE 5 ---- */
  {
    id: 'doubles',
    name: 'Doubles & Moitiés',
    emoji: '👯',
    color: '#b794f4',
    description: "Le double, c'est ajouter un nombre à lui-même. La moitié, c'est partager en 2.",
    lesson: `
      <h3>👯 Doubles & Moitiés</h3>

      <h4>2️⃣ Le double</h4>
      <p>Doubler un nombre = <strong>l'ajouter à lui-même</strong>.</p>
      <div class="ex">Double de 6 = 6 + 6 = <b>12</b></div>

      <h4>📜 Les doubles à connaître</h4>
      <ul>
        <li>Double de 1 = 2</li>
        <li>Double de 2 = 4</li>
        <li>Double de 3 = 6</li>
        <li>Double de 4 = 8</li>
        <li>Double de 5 = 10</li>
        <li>Double de 6 = 12</li>
        <li>Double de 7 = 14</li>
        <li>Double de 8 = 16</li>
        <li>Double de 9 = 18</li>
        <li>Double de 10 = 20</li>
      </ul>

      <h4>✂️ La moitié</h4>
      <p>Moitié = <strong>partager en 2 parts égales</strong>.</p>
      <div class="ex">Moitié de 12 = <b>6</b> (car 6 + 6 = 12)</div>
      <div class="tip">💡 Si on connaît les doubles, on connaît les moitiés !</div>

      <h4>🚀 Doubler un grand nombre</h4>
      <p>Pour le double de 23, on double les dizaines puis les unités :</p>
      <div class="ex">Double de 20 = 40<br>
        Double de 3 = 6<br>
        Total : <b>46</b></div>
    `,
    stages: [
      { name: 'Petits doubles', desc: 'jusqu\'à 10', count: 12, gen: gen_double_small, drillKey: 'doubleSmall' },
      { name: 'Doubles + grands', desc: 'jusqu\'à 25', count: 12, gen: gen_double_med, drillKey: 'doubleMed' },
      { name: 'Petites moitiés', desc: 'pairs ≤ 20', count: 12, gen: gen_half_small, drillKey: 'halfSmall' },
      { name: 'Moitié des dizaines', desc: '40, 60, 80...', count: 12, gen: gen_half_tens, drillKey: 'halfTens' },
      { name: '⚡ Drill 30', desc: '30 doubles & moitiés', count: 30, gen: gen_doubles_mix, drill: true },
      { name: 'Mix', desc: 'tout mélangé', count: 12, gen: gen_doubles_mix },
    ]
  },

  /* ---- MONDE 6 ---- */
  {
    id: 'skip',
    name: 'Compter en Sautant',
    emoji: '🪜',
    color: '#f72585',
    description: "Compter de 2 en 2, de 5 en 5, de 10 en 10. Et bondir avec +10 / −10 sans réfléchir.",
    lesson: `
      <h3>🪜 Compter en Sautant</h3>
      <p>Au lieu de compter un par un, on <strong>fait des sauts</strong>. C'est plus rapide !</p>

      <h4>🐰 Sauter de 2 en 2 (les pairs)</h4>
      <p>0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20...</p>

      <h4>⭐ Sauter de 5 en 5</h4>
      <p>0, 5, 10, 15, 20, 25, 30, 35, 40...</p>
      <div class="tip">💡 Ça finit toujours par <b>0</b> ou <b>5</b> !</div>

      <h4>🚀 Sauter de 10 en 10</h4>
      <p>0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100</p>

      <h4>+10 / −10 instantané</h4>
      <p>Ajouter 10 = <b>monter d'une dizaine</b>. Le chiffre des unités ne change pas !</p>
      <div class="ex">37 + 10 = <b>47</b><br>52 − 10 = <b>42</b></div>
    `,
    stages: [
      { name: 'De 2 en 2', desc: 'compter par 2', count: 12, gen: gen_skip2, drillKey: 'skip2' },
      { name: 'De 5 en 5', desc: 'compter par 5', count: 12, gen: gen_skip5, drillKey: 'skip5' },
      { name: 'De 10 en 10', desc: 'compter par 10', count: 12, gen: gen_skip10, drillKey: 'skip10' },
      { name: '+10 instantané', desc: 'n + 10', count: 12, gen: gen_plus10, drillKey: 'plus10' },
      { name: '−10 instantané', desc: 'n − 10', count: 12, gen: gen_minus10, drillKey: 'minus10' },
      { name: '⚡ Drill 30', desc: '30 sauts', count: 30, gen: gen_skip_mix, drill: true },
      { name: 'Mix sauts', desc: 'tout mélangé', count: 12, gen: gen_skip_mix },
    ]
  },

  /* ---- MONDE 7 ---- */
  {
    id: 'tables',
    name: 'Tables Faciles',
    emoji: '🔟',
    color: '#7209b7',
    description: "Les premières tables : ×2, ×5, ×10 et ×3. Les plus utiles, et les plus simples !",
    lesson: `
      <h3>🔟 Tables Faciles</h3>
      <p>Multiplier, c'est <strong>ajouter plusieurs fois le même nombre</strong>.</p>
      <div class="ex">3 × 4 = 4 + 4 + 4 = <b>12</b></div>

      <h4>2️⃣ Table de 2 = doubler</h4>
      <p>1×2=2 · 2×2=4 · 3×2=6 · 4×2=8 · 5×2=10 · 6×2=12 · 7×2=14 · 8×2=16 · 9×2=18 · 10×2=20</p>

      <h4>5️⃣ Table de 5</h4>
      <p>5, 10, 15, 20, 25, 30, 35, 40, 45, 50</p>
      <div class="tip">💡 Ça finit toujours par <b>0</b> ou <b>5</b>.</div>

      <h4>🔟 Table de 10 (la plus facile !)</h4>
      <p>×10, on ajoute juste un <b>0</b> :</p>
      <div class="ex">7 × 10 = <b>70</b> · 4 × 10 = <b>40</b></div>

      <h4>3️⃣ Table de 3</h4>
      <p>Astuce : ×3 = ×2 + 1 fois.</p>
      <div class="ex">7 × 3 → 7 × 2 = 14, puis +7 = <b>21</b></div>
    `,
    stages: [
      { name: 'Table de 10', desc: 'la plus facile', count: 12, gen: gen_table10, drillKey: 'tab10' },
      { name: 'Table de 2', desc: 'doubler', count: 12, gen: gen_table2, drillKey: 'tab2' },
      { name: 'Table de 5', desc: 'finit par 0 ou 5', count: 12, gen: gen_table5, drillKey: 'tab5' },
      { name: 'Table de 3', desc: 'avec l\'astuce ×2 + n', count: 12, gen: gen_table3, drillKey: 'tab3' },
      { name: '⚡ Drill 30 ×10', desc: '30 ×10 d\'affilée', count: 30, gen: gen_table10, drill: true },
      { name: '⚡ Drill 30 ×2', desc: '30 ×2 d\'affilée', count: 30, gen: gen_table2, drill: true },
      { name: '⚡ Drill 30 ×5', desc: '30 ×5 d\'affilée', count: 30, gen: gen_table5, drill: true },
      { name: 'Mix tables', desc: 'tout mélangé', count: 15, gen: gen_tables_mix },
    ]
  },

  /* ---- MONDE 8 ---- */
  {
    id: 'decomp',
    name: 'Décomposer',
    emoji: '🧩',
    color: '#ff8500',
    description: "Casser un nombre en morceaux faciles. C'est le secret pour calculer plus vite.",
    lesson: `
      <h3>🧩 Décomposer</h3>
      <p>Décomposer = <strong>couper un nombre en morceaux</strong> pour mieux le manipuler.</p>

      <h4>🔟 Décomposer en 10 + reste</h4>
      <div class="ex">15 = 10 + 5<br>17 = 10 + 7<br>13 = 10 + 3</div>

      <h4>🧱 Décomposer en dizaines + unités</h4>
      <div class="ex">47 = 40 + 7<br>83 = 80 + 3</div>

      <h4>🎯 Aller au rond</h4>
      <p>Pour ajouter à 8, on cherche d'abord à atteindre 10 :</p>
      <div class="ex">8 + 5 = 8 + <b>2</b> + 3 = 10 + 3 = <b>13</b></div>

      <h4>👯 Le truc du double</h4>
      <p>Pour 6 + 7, on remarque que 7 = 6 + 1 :</p>
      <div class="ex">6 + 7 = (6 + 6) + 1 = 12 + 1 = <b>13</b></div>
    `,
    stages: [
      { name: 'Couper en 10 + reste', desc: '15 = 10 + ?', count: 12, gen: gen_decomp10, drillKey: 'dec10' },
      { name: 'Dizaine + unités', desc: '47 = 40 + ?', count: 12, gen: gen_decomp_du, drillKey: 'decDU' },
      { name: 'Aller au rond', desc: 'compléter à 10', count: 12, gen: gen_decomp_to_round, drillKey: 'decRound' },
      { name: 'Truc du double', desc: '6 + 7 avec le double de 6', count: 12, gen: gen_decomp_double_use, drillKey: 'decDouble' },
      { name: '⚡ Drill 30', desc: '30 décompositions', count: 30, gen: gen_decomp_mix, drill: true },
      { name: 'Mix', desc: 'tout mélangé', count: 12, gen: gen_decomp_mix },
    ]
  },

  /* ---- MONDE 9 ---- */
  {
    id: 'boss',
    name: 'Le Grand Boss',
    emoji: '👑',
    color: '#ffd700',
    description: "Tout ce que tu as appris, mélangé ! Prêt à devenir un champion ?",
    lesson: `
      <h3>👑 Le Grand Boss</h3>
      <p>Ici, on mélange <strong>toutes les astuces</strong> : additions, soustractions, doubles, tables, amis de 10...</p>

      <h4>🎯 Comment réussir ?</h4>
      <ul>
        <li>Bien lire la question</li>
        <li>Repérer l'astuce qui va vite</li>
        <li>Calculer dans sa tête</li>
        <li>Garder le calme : tu connais tout ça !</li>
      </ul>

      <h4>💪 Exemples</h4>
      <div class="ex">7 + 8 → astuce du double : (7+7) + 1 = <b>15</b></div>
      <div class="ex">Moitié de 80 → moitié de 8 dizaines = <b>40</b></div>
      <div class="ex">6 × 5 → table de 5 : <b>30</b></div>

      <h4>🏆 Boss final</h4>
      <p>Si tu termines ce monde, tu es <b>Champion Calastu Junior</b> !</p>
    `,
    stages: [
      { name: 'Mix facile', desc: 'rappel des bases', count: 12, gen: gen_mix_easy },
      { name: 'Mix moyen', desc: 'tout devient sérieux', count: 12, gen: gen_mix_med },
      { name: 'Mix difficile', desc: 'pour les pros', count: 12, gen: gen_mix_hard },
      { name: 'Mode Boss', desc: 'le grand mix', count: 15, gen: gen_mix_boss },
    ]
  },
];

/* ============================================================
   GÉNÉRATEUR pour défi du jour / survie / boss
   ============================================================ */

function challengeGenForStage(world, stageIdx) {
  const baseStage = world.stages[stageIdx];
  return baseStage.gen;
}

function gen_daily(level) {
  if (level <= 2) return gen_mix_easy();
  if (level <= 5) return pick([gen_mix_easy, gen_mix_med])();
  if (level <= 10) return gen_mix_med();
  return pick([gen_mix_med, gen_mix_hard])();
}

function gen_survival(survived) {
  if (survived < 3) return gen_mix_easy();
  if (survived < 8) return gen_mix_med();
  if (survived < 15) return gen_mix_hard();
  return gen_mix_boss();
}

/* Trophées */
const TROPHIES = [
  { id: 'first_blood', emoji: '🎯', name: 'Premier exercice', desc: 'Bienvenue !' },
  { id: 'world1_done', emoji: '🔢', name: 'Maître des Nombres', desc: 'Termine le Monde 1' },
  { id: 'world2_done', emoji: '➕', name: 'Maître des Additions', desc: 'Termine le Monde 2' },
  { id: 'world3_done', emoji: '➖', name: 'Maître des Soustractions', desc: 'Termine le Monde 3' },
  { id: 'world4_done', emoji: '🤝', name: 'Maître des Amis de 10', desc: 'Termine le Monde 4' },
  { id: 'world5_done', emoji: '👯', name: 'Maître Doubles & Moitiés', desc: 'Termine le Monde 5' },
  { id: 'world6_done', emoji: '🪜', name: 'Sauteur de Génie', desc: 'Termine le Monde 6' },
  { id: 'world7_done', emoji: '🔟', name: 'Maître des Tables', desc: 'Termine le Monde 7' },
  { id: 'world8_done', emoji: '🧩', name: 'Maître Décomposition', desc: 'Termine le Monde 8' },
  { id: 'world9_done', emoji: '👑', name: 'Champion Calastu Junior', desc: 'Termine le Monde 9' },
  { id: 'streak_10', emoji: '🔥', name: 'Combo x10', desc: '10 bonnes réponses d\'affilée' },
  { id: 'streak_20', emoji: '⚡', name: 'Combo x20', desc: '20 d\'affilée !' },
  { id: 'perfect', emoji: '💯', name: 'Sans-Faute', desc: 'Un niveau sans erreur' },
  { id: 'survivor_10', emoji: '💀', name: 'Survivant', desc: '10 réussis en mode survie' },
  { id: 'survivor_25', emoji: '☠️', name: 'Indestructible', desc: '25 en mode survie' },
  { id: 'daily_5', emoji: '📅', name: 'Régulier', desc: '5 défis du jour relevés' },
  { id: 'lvl_10', emoji: '🥈', name: 'Niveau 10', desc: 'Atteins le niveau 10' },
  { id: 'lvl_25', emoji: '🥇', name: 'Niveau 25', desc: 'Atteins le niveau 25' },
  { id: 'lvl_50', emoji: '👑', name: 'Légende', desc: 'Atteins le niveau 50' },
  { id: 'all_lessons', emoji: '📚', name: 'Studieux', desc: 'Lis toutes les leçons' },
  { id: 'chrono_10', emoji: '⏱️', name: 'Éclair', desc: '10 réussis en Chrono' },
  { id: 'chrono_20', emoji: '⚡', name: 'Foudre', desc: '20 réussis en Chrono' },
  { id: 'chrono_30', emoji: '🌪️', name: 'Tornade', desc: '30 réussis en Chrono' },
  { id: 'master_5', emoji: '🎓', name: 'Apprenti Maître', desc: 'Maîtrise 5 niveaux (3★)' },
  { id: 'master_15', emoji: '🧙', name: 'Maître', desc: 'Maîtrise 15 niveaux (3★)' },
  { id: 'master_30', emoji: '🏅', name: 'Grand Maître', desc: 'Maîtrise 30 niveaux (3★)' },
  { id: 'streak_day_3', emoji: '📆', name: 'Sérieux', desc: '3 jours d\'affilée' },
  { id: 'streak_day_7', emoji: '🗓️', name: 'Une semaine !', desc: '7 jours d\'affilée' },
  { id: 'streak_day_30', emoji: '📅', name: 'Un mois !', desc: '30 jours d\'affilée' },
  { id: 'streak_day_100', emoji: '🔥', name: 'Centenaire', desc: '100 jours d\'affilée !' },
  { id: 'rapid_fire', emoji: '🚀', name: 'Tir Rapide', desc: '5 réponses en moins de 5s chacune' },
  { id: 'comeback', emoji: '🔁', name: 'Phénix', desc: 'Réussir après 2 erreurs d\'affilée' },
  { id: 'night_owl', emoji: '🦉', name: 'Hibou', desc: 'Jouer après 21h' },
  { id: 'early_bird', emoji: '🐓', name: 'Coq', desc: 'Jouer avant 8h' },
  { id: 'big_score', emoji: '💎', name: 'Gros Coup', desc: '100 XP en une session' },
  { id: 'globetrotter', emoji: '🗺️', name: 'Globetrotteur', desc: 'Jouer dans les 9 mondes' },
];

const AVATARS = ['🦊', '🐯', '🦁', '🐼', '🐨', '🐸', '🦄', '🐲', '🦉', '🐱', '🐶', '🐰', '🐭', '🦝', '🐺', '🐵', '🦖', '🐙', '🦋', '🐢', '🦓', '🐧', '🦅', '🦩'];

/* ===== Rangs (titres honorifiques selon le niveau) ===== */
const RANKS = [
  { level: 1,  name: 'Apprenti',          emoji: '🌱', color: '#06d6a0' },
  { level: 5,  name: 'Petit Calculateur', emoji: '✏️', color: '#4cc9f0' },
  { level: 10, name: 'Explorateur',       emoji: '🗺️', color: '#7209b7' },
  { level: 15, name: 'Aventurier',        emoji: '⚔️', color: '#b794f4' },
  { level: 20, name: 'Champion',          emoji: '🎼', color: '#ffd166' },
  { level: 30, name: 'Maître',            emoji: '🧙', color: '#ff6b9d' },
  { level: 40, name: 'Sage',              emoji: '🦉', color: '#f72585' },
  { level: 50, name: 'Super-Champion',    emoji: '🏆', color: '#ff8500' },
  { level: 65, name: 'Héros',             emoji: '⭐', color: '#ffd700' },
  { level: 80, name: 'Légende',           emoji: '👑', color: '#ff006e' },
  { level: 100,name: 'Étoile d\'Or',      emoji: '🌟', color: '#ff0080' },
];

function rankFor(level) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.level) r = x;
  return r;
}

function nextRank(level) {
  for (const x of RANKS) if (x.level > level) return x;
  return null;
}

/* ===== Seuils de temps par astuce =====
   Les enfants de 6-8 ans saisissent lentement et lisent lentement.
   Les seuils sont GÉNÉREUX par rapport à la version "grands". */
const TIME_THRESHOLDS = {
  // Monde Nombres
  count:        { fast: 6.0,  ok: 14.0, label: 'Compter' },
  countGrp:     { fast: 7.0,  ok: 16.0, label: 'Paquets de 5' },
  compare:      { fast: 5.0,  ok: 12.0, label: 'Comparer' },
  next:         { fast: 4.0,  ok: 10.0, label: 'Le suivant' },
  prev:         { fast: 4.0,  ok: 10.0, label: 'Le précédent' },
  decompDU:     { fast: 5.0,  ok: 12.0, label: 'Dizaines + unités' },
  // Additions
  addSmall:     { fast: 4.0,  ok: 10.0, label: 'Petite addition' },
  addTo10:      { fast: 5.0,  ok: 12.0, label: 'Addition ≤ 10' },
  addTo20:      { fast: 6.0,  ok: 14.0, label: 'Addition ≤ 20' },
  addTens:      { fast: 5.0,  ok: 12.0, label: 'Dizaines entières' },
  addDU:        { fast: 4.0,  ok: 10.0, label: 'Dizaine + unité' },
  addPass:      { fast: 8.0,  ok: 18.0, label: 'Passage de la dizaine' },
  // Soustractions
  subSmall:     { fast: 5.0,  ok: 12.0, label: 'Petite soustraction' },
  subTo10:      { fast: 5.0,  ok: 12.0, label: 'Soustraction ≤ 10' },
  subTo20:      { fast: 8.0,  ok: 18.0, label: 'Soustraction ≤ 20' },
  subTens:      { fast: 6.0,  ok: 14.0, label: 'Dizaines entières' },
  subDU:        { fast: 5.0,  ok: 12.0, label: 'Enlever les unités' },
  // Amis
  friend10:     { fast: 4.0,  ok: 10.0, label: 'Amis de 10' },
  friend10rev:  { fast: 4.0,  ok: 10.0, label: 'Amis de 10' },
  friend20:     { fast: 5.0,  ok: 12.0, label: 'Amis de 20' },
  friendRound:  { fast: 6.0,  ok: 14.0, label: 'Aller au rond' },
  // Doubles & moitiés
  doubleSmall:  { fast: 4.0,  ok: 10.0, label: 'Double' },
  doubleMed:    { fast: 7.0,  ok: 16.0, label: 'Double + grand' },
  halfSmall:    { fast: 5.0,  ok: 12.0, label: 'Moitié' },
  halfTens:     { fast: 6.0,  ok: 14.0, label: 'Moitié des dizaines' },
  // Sauts
  skip2:        { fast: 6.0,  ok: 14.0, label: 'De 2 en 2' },
  skip5:        { fast: 6.0,  ok: 14.0, label: 'De 5 en 5' },
  skip10:       { fast: 6.0,  ok: 14.0, label: 'De 10 en 10' },
  plus10:       { fast: 4.0,  ok: 10.0, label: '+10' },
  minus10:      { fast: 4.0,  ok: 10.0, label: '−10' },
  // Tables
  tab2:         { fast: 4.0,  ok: 10.0, label: 'Table de 2' },
  tab5:         { fast: 5.0,  ok: 12.0, label: 'Table de 5' },
  tab10:        { fast: 4.0,  ok: 10.0, label: 'Table de 10' },
  tab3:         { fast: 6.0,  ok: 14.0, label: 'Table de 3' },
  // Décomposer
  dec10:        { fast: 5.0,  ok: 12.0, label: '10 + reste' },
  decDU:        { fast: 5.0,  ok: 12.0, label: 'Dizaine + unités' },
  decRound:     { fast: 5.0,  ok: 12.0, label: 'Aller au rond' },
  decDouble:    { fast: 7.0,  ok: 16.0, label: 'Truc du double' },
  // Fallback générique
  _default:     { fast: 7.0,  ok: 16.0, label: 'Calcul mental' },
};

function thresholdFor(drillKey) {
  return TIME_THRESHOLDS[drillKey] || TIME_THRESHOLDS._default;
}

/* Évalue une réponse : renvoie le statut + le seuil utilisé */
function evaluateAnswer(isCorrect, elapsedSec, drillKey) {
  if (!isCorrect) return { status: 'WRONG', emoji: '❌', label: 'Faux', threshold: thresholdFor(drillKey) };
  const t = thresholdFor(drillKey);
  if (elapsedSec <= t.fast) return { status: 'MASTERED', emoji: '💎', label: 'Réflexe astuce', threshold: t };
  if (elapsedSec <= t.ok)   return { status: 'CORRECT',  emoji: '✅', label: 'Bon mais lent', threshold: t };
  return                          { status: 'SLOW',     emoji: '🐢', label: 'Calcul brut', threshold: t };
}

window.TIME_THRESHOLDS = TIME_THRESHOLDS;
window.thresholdFor = thresholdFor;
window.evaluateAnswer = evaluateAnswer;

/* ===== Accessoires d'avatar débloqués selon le niveau ===== */
const AVATAR_ACCESSORIES = [
  { level: 1,  emoji: '',     name: 'Débutant' },
  { level: 3,  emoji: '🎒',   name: 'Cartable' },
  { level: 5,  emoji: '👓',   name: 'Lunettes' },
  { level: 8,  emoji: '🎩',   name: 'Chapeau magique' },
  { level: 12, emoji: '⚡',   name: 'Éclair de génie' },
  { level: 16, emoji: '🦸',   name: 'Cape de héros' },
  { level: 22, emoji: '🥋',   name: 'Ceinture noire' },
  { level: 30, emoji: '🏆',   name: 'Trophée doré' },
  { level: 40, emoji: '🔮',   name: 'Boule de cristal' },
  { level: 50, emoji: '👑',   name: 'Couronne' },
  { level: 65, emoji: '💎',   name: 'Diamant' },
  { level: 80, emoji: '🌟',   name: 'Étoile légendaire' },
  { level: 100,emoji: '🌌',   name: 'Galaxie' },
];

function accessoryFor(level) {
  let acc = AVATAR_ACCESSORIES[0];
  for (const a of AVATAR_ACCESSORIES) if (level >= a.level) acc = a;
  return acc;
}

function nextAccessory(level) {
  for (const a of AVATAR_ACCESSORIES) if (a.level > level) return a;
  return null;
}

/* ===== Boutique : items achetables avec des pièces 💰 ===== */
const SHOP_ITEMS = [
  { id: 'hat_party',   emoji: '🎉', name: 'Chapeau de fête',     cost: 50,  type: 'hat' },
  { id: 'hat_crown',   emoji: '👑', name: 'Couronne dorée',      cost: 200, type: 'hat' },
  { id: 'hat_cap',     emoji: '🧢', name: 'Casquette swag',      cost: 80,  type: 'hat' },
  { id: 'hat_wizard',  emoji: '🧙', name: 'Chapeau de magicien', cost: 150, type: 'hat' },
  { id: 'hat_cowboy',  emoji: '🤠', name: 'Chapeau cowboy',      cost: 100, type: 'hat' },
  { id: 'access_glasses',emoji: '🕶️', name: 'Lunettes de soleil', cost: 60, type: 'access' },
  { id: 'access_medal',  emoji: '🥇', name: 'Médaille d\'or',      cost: 120, type: 'access' },
  { id: 'access_scarf',  emoji: '🧣', name: 'Écharpe d\'hiver',    cost: 40,  type: 'access' },
  { id: 'access_book',   emoji: '📚', name: 'Livre du sage',       cost: 90,  type: 'access' },
  { id: 'access_rocket', emoji: '🚀', name: 'Fusée',                cost: 180, type: 'access' },
  { id: 'theme_galaxy',  emoji: '🌌', name: 'Thème Galaxie',         cost: 250, type: 'theme' },
  { id: 'theme_forest',  emoji: '🌲', name: 'Thème Forêt',           cost: 150, type: 'theme' },
  { id: 'theme_fire',    emoji: '🔥', name: 'Thème Feu',             cost: 200, type: 'theme' },
  { id: 'theme_ocean',   emoji: '🌊', name: 'Thème Océan',           cost: 150, type: 'theme' },
  { id: 'sticker_star',  emoji: '⭐', name: 'Étoile brillante',      cost: 70,  type: 'sticker' },
  { id: 'sticker_heart', emoji: '💖', name: 'Cœur diamant',          cost: 80,  type: 'sticker' },
  { id: 'sticker_lightning',emoji: '⚡', name: 'Foudre',                cost: 60, type: 'sticker' },
  { id: 'sticker_diamond', emoji: '💎', name: 'Diamant pur',           cost: 220, type: 'sticker' },
];

const SHOP_THEMES = {
  theme_galaxy: { bg: 'linear-gradient(180deg, #0d0033 0%, #1a0066 50%, #4d00b3 100%)', accent: '#9d4edd' },
  theme_forest: { bg: 'linear-gradient(180deg, #0a2e1a 0%, #145533 50%, #2d8a52 100%)', accent: '#7bc97b' },
  theme_fire:   { bg: 'linear-gradient(180deg, #2e0a0a 0%, #771414 50%, #ff4d00 100%)', accent: '#ffae00' },
  theme_ocean:  { bg: 'linear-gradient(180deg, #001a33 0%, #003d77 50%, #0077b3 100%)', accent: '#4cc9f0' },
};

window.SHOP_ITEMS = SHOP_ITEMS;
window.SHOP_THEMES = SHOP_THEMES;
window.AVATAR_ACCESSORIES = AVATAR_ACCESSORIES;
window.accessoryFor = accessoryFor;
window.nextAccessory = nextAccessory;

/* ===== Quelques noms (utilisés ailleurs si besoin) ===== */
const NAMES = ['Léo','Lucas','Emma','Lina','Sami','Maya','Tom','Inès','Hugo','Mia','Alix','Noah','Jade','Yann','Sara','Léa','Adam','Anna','Théo','Lou'];

/* Expose pour tooling/tests externes */
window.WORLDS = WORLDS;
window.TROPHIES = TROPHIES;
window.AVATARS = AVATARS;
window.RANKS = RANKS;
window.NAMES = NAMES;
window.gen_daily = gen_daily;
window.gen_survival = gen_survival;
window.fmt = fmt;
window.answerEquals = answerEquals;
