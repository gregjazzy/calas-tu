/* ============================================================
   CALASTU — Banque d'exercices et leçons
   Chaque "monde" a :
     - id, name, emoji, description, color
     - lesson : HTML pédagogique
     - stages : tableau de niveaux. Chaque stage a un générateur.
   Un exercice généré = { question, answer, trick, explanation, label }
   ============================================================ */

/* ===== Helpers ===== */
const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

// Format un nombre proprement (virgule en français, pas de zéros traînants)
function fmt(n) {
  if (Number.isInteger(n)) return n.toString();
  // arrondi à 6 décimales pour éviter 0.30000000000000004
  let s = (Math.round(n * 1e6) / 1e6).toString();
  return s.replace('.', ',');
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

/* ---------- MONDE 1 : LES ZÉROS ---------- */

function gen_x10_simple() {
  const n = rng(2, 99);
  const m = pick([10, 100, 1000]);
  return {
    question: `${n} × ${m}`,
    answer: n * m,
    trick: "Multiplication par 10, 100, 1000",
    explanation: `<b>Astuce :</b> on ajoute autant de zéros que dans le multiplicateur.<br>
      <span class="step">×10 → on ajoute <b>1</b> zéro</span>
      <span class="step">×100 → on ajoute <b>2</b> zéros</span>
      <span class="step">×1000 → on ajoute <b>3</b> zéros</span>
      <span class="step">Donc <b>${n} × ${m} = ${n * m}</b></span>`
  };
}

function gen_x10_decimal() {
  const a = rng(1, 999) / 10; // 0.1 à 99.9
  const m = pick([10, 100, 1000]);
  const r = a * m;
  const shifts = m === 10 ? 1 : m === 100 ? 2 : 3;
  return {
    question: `${fmt(a)} × ${m}`,
    answer: r,
    trick: "×10/100/1000 sur un décimal",
    explanation: `<b>Astuce :</b> on déplace la virgule vers la <strong>droite</strong>.<br>
      <span class="step">×${m} → virgule décalée de <b>${shifts}</b> rang${shifts>1?'s':''} à droite</span>
      <span class="step">${fmt(a)} → ${fmt(r)}</span>`
  };
}

function gen_div10() {
  const n = pick([10, 100, 1000]) * rng(2, 99);
  const d = pick([10, 100, 1000]);
  return {
    question: `${n} ÷ ${d}`,
    answer: n / d,
    trick: "Division par 10, 100, 1000",
    explanation: `<b>Astuce :</b> on déplace la virgule vers la <strong>gauche</strong> (= on enlève des zéros).<br>
      <span class="step">${n} ÷ ${d} → virgule de <b>${d.toString().length - 1}</b> rang(s) à gauche</span>
      <span class="step">= <b>${fmt(n / d)}</b></span>`
  };
}

function gen_x01() {
  const n = rng(20, 9990);
  const m = pick([0.1, 0.01, 0.001]);
  const shifts = m === 0.1 ? 1 : m === 0.01 ? 2 : 3;
  return {
    question: `${n} × ${fmt(m)}`,
    answer: n * m,
    trick: "Multiplication par 0,1 / 0,01 / 0,001",
    explanation: `<b>Truc :</b> ×0,1 = ÷10. ×0,01 = ÷100. ×0,001 = ÷1000.<br>
      <span class="step">On déplace la virgule de <b>${shifts}</b> rang(s) à <strong>gauche</strong></span>
      <span class="step">${n} × ${fmt(m)} = <b>${fmt(n * m)}</b></span>`
  };
}

function gen_div01() {
  const n = rng(2, 99);
  const m = pick([0.1, 0.01]);
  const shifts = m === 0.1 ? 1 : 2;
  const r = n / m;
  return {
    question: `${n} ÷ ${fmt(m)}`,
    answer: r,
    trick: "Division par 0,1 / 0,01",
    explanation: `<b>Magique :</b> diviser par 0,1 c'est <strong>multiplier par 10</strong> !<br>
      <span class="step">÷0,1 = ×10 ; ÷0,01 = ×100</span>
      <span class="step">${n} ÷ ${fmt(m)} = ${n} × ${1/m} = <b>${r}</b></span>`
  };
}

function gen_zeros_mix() {
  return pick([gen_x10_simple, gen_x10_decimal, gen_div10, gen_x01, gen_div01])();
}

function gen_zeros_long() {
  // chaîne de 3 opérations type ×10, ×0,1, ÷100
  const start = rng(2, 99);
  const ops = [];
  let v = start;
  const steps = [];
  for (let i = 0; i < 3; i++) {
    const op = pick([
      { sym: '×10', fn: x => x * 10, lbl: '×10 → +1 zéro / virgule à droite' },
      { sym: '×100', fn: x => x * 100, lbl: '×100 → +2 zéros' },
      { sym: '×0,1', fn: x => x * 0.1, lbl: '×0,1 = ÷10 → virgule à gauche' },
      { sym: '×0,01', fn: x => x * 0.01, lbl: '×0,01 = ÷100' },
      { sym: '÷10', fn: x => x / 10, lbl: '÷10 → virgule à gauche' },
      { sym: '÷100', fn: x => x / 100, lbl: '÷100' },
    ]);
    ops.push(op.sym);
    const before = v;
    v = op.fn(v);
    steps.push(`<span class="step">${fmt(before)} ${op.sym} = <b>${fmt(v)}</b> <i>(${op.lbl})</i></span>`);
  }
  return {
    question: `${start} ${ops.join(' ')}`.replace(/×/g, '×').replace(/÷/g, '÷'),
    answer: v,
    trick: "Chaîne de zéros",
    explanation: `On enchaîne en déplaçant la virgule à chaque fois.${steps.join('')}`
  };
}

/* ---------- MONDE 2 : COMPLÉMENTS ---------- */

function gen_compl10() {
  const n = rng(1, 9);
  return {
    question: `${n} + ? = 10`,
    answer: 10 - n,
    trick: "Compléments à 10",
    explanation: `<b>À retenir par cœur :</b> 1+9, 2+8, 3+7, 4+6, 5+5.<br>
      <span class="step">${n} + <b>${10-n}</b> = 10</span>`
  };
}

function gen_compl100() {
  const n = rng(1, 99);
  const r = 100 - n;
  return {
    question: `${n} + ? = 100`,
    answer: r,
    trick: "Compléments à 100",
    explanation: `<b>Astuce :</b> les <strong>dizaines</strong> font 9 ensemble, les <strong>unités</strong> font 10.<br>
      <span class="step">${n} : ${Math.floor(n/10)} dizaines + ${n%10} unités</span>
      <span class="step">→ il faut ${9 - Math.floor(n/10)} dizaines et ${n%10===0 ? 0 : 10 - n%10} unités</span>
      <span class="step">Réponse : <b>${r}</b></span>${
        n % 10 === 0 ? '<br><i>(Si l\'unité fait 0, on prend 0 d\'unité — sinon on aurait ajouté 10 = 1 dizaine.)</i>' : ''
      }`
  };
}

function gen_compl1000() {
  // multiples de 10 plus simples au début
  const n = rng(10, 999);
  const r = 1000 - n;
  return {
    question: `${n} + ? = 1000`,
    answer: r,
    trick: "Compléments à 1000",
    explanation: `<b>Méthode :</b> centaines font 9, dizaines font 9, unités font 10 (sauf si déjà 0).<br>
      <span class="step">${n} → centaines: ${Math.floor(n/100)}, dizaines: ${Math.floor(n/10)%10}, unités: ${n%10}</span>
      <span class="step">Complément : <b>${r}</b></span>`
  };
}

function gen_compl_to_round() {
  // Compléter à un nombre rond proche
  const tens = rng(2, 9) * 10;
  const n = rng(tens - 9, tens - 1);
  const r = tens - n;
  return {
    question: `${n} + ? = ${tens}`,
    answer: r,
    trick: "Compléter à la dizaine",
    explanation: `<b>Truc :</b> regarde l'unité de ${n}, et complète à 10.<br>
      <span class="step">${n%10} + <b>${r}</b> = 10 → ${n} + ${r} = ${tens}</span>`
  };
}

function gen_compl_decimal() {
  const ent = rng(1, 9);
  const dec = rng(1, 9);
  const n = ent + dec/10;
  const r = (ent + 1) - n;
  return {
    question: `${fmt(n)} + ? = ${ent + 1}`,
    answer: r,
    trick: "Compléter à l'entier suivant",
    explanation: `<b>Astuce :</b> regarde la partie décimale et complète à 1.<br>
      <span class="step">0,${dec} + 0,${10-dec} = 1</span>
      <span class="step">${fmt(n)} + <b>${fmt(r)}</b> = ${ent+1}</span>`
  };
}

function gen_compl_long() {
  // 3 nombres à recomposer = nombre rond
  const tot = pick([100, 100, 1000]);
  const a = rng(10, tot - 30);
  const b = rng(10, tot - a - 10);
  const c = tot - a - b;
  return {
    question: `${a} + ${b} + ? = ${tot}`,
    answer: c,
    trick: "Complément après somme",
    explanation: `<b>Étape par étape :</b><br>
      <span class="step">D'abord ${a} + ${b} = <b>${a+b}</b></span>
      <span class="step">Puis ${tot} − ${a+b} = <b>${c}</b></span>
      <span class="step">Donc ${a} + ${b} + <b>${c}</b> = ${tot}</span>`
  };
}

/* ---------- MONDE 3 : ASTUCES MULTIPLICATION ---------- */

function gen_x5() {
  const n = pick([rng(12, 98), rng(12, 98) * 2]); // pair plus simple
  const r = n * 5;
  return {
    question: `${n} × 5`,
    answer: r,
    trick: "×5 = ×10 ÷ 2",
    explanation: `<b>Astuce :</b> multiplier par 5, c'est multiplier par 10 et diviser par 2 !<br>
      <span class="step">${n} × 10 = ${n*10}</span>
      <span class="step">${n*10} ÷ 2 = <b>${r}</b></span>`
  };
}

function gen_x50() {
  const n = rng(4, 98);
  return {
    question: `${n} × 50`,
    answer: n * 50,
    trick: "×50 = ×100 ÷ 2",
    explanation: `<b>×50 = ×100 ÷ 2</b><br>
      <span class="step">${n} × 100 = ${n*100}</span>
      <span class="step">${n*100} ÷ 2 = <b>${n*50}</b></span>`
  };
}

function gen_x25() {
  const n = pick([4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 60, 100, rng(5, 80)]);
  return {
    question: `${n} × 25`,
    answer: n * 25,
    trick: "×25 = ×100 ÷ 4",
    explanation: `<b>×25 = ×100 ÷ 4</b><br>
      <span class="step">${n} × 100 = ${n*100}</span>
      <span class="step">${n*100} ÷ 4 = <b>${n*25}</b></span>`
  };
}

function gen_x9() {
  const n = rng(2, 99);
  return {
    question: `${n} × 9`,
    answer: n * 9,
    trick: "×9 = ×10 − ×1",
    explanation: `<b>Astuce :</b> 9 = 10 − 1, donc <b>×9 = ×10 − le nombre lui-même</b>.<br>
      <span class="step">${n} × 10 = ${n*10}</span>
      <span class="step">${n*10} − ${n} = <b>${n*9}</b></span>`
  };
}

function gen_x11_simple() {
  const n = rng(10, 99);
  const u = n % 10, d = Math.floor(n / 10);
  const sum = d + u;
  let trickLine;
  if (sum < 10) {
    trickLine = `Place la somme ${d}+${u}=${sum} au milieu : <b>${d}${sum}${u}</b> = ${n*11}`;
  } else {
    trickLine = `${d}+${u}=${sum} (≥10) → tu mets ${sum%10} au milieu et tu retiens 1 sur la dizaine : <b>${d+1}${sum%10}${u}</b> = ${n*11}`;
  }
  return {
    question: `${n} × 11`,
    answer: n * 11,
    trick: "×11 (truc des deux chiffres)",
    explanation: `<b>Truc magique :</b> pour ${n} × 11, additionne les deux chiffres ${d} et ${u}.<br>
      <span class="step">${trickLine}</span>
      <span class="step"><b>Méthode sûre :</b> ${n} × 11 = ${n} × 10 + ${n} = ${n*10} + ${n} = <b>${n*11}</b></span>`
  };
}

function gen_x15() {
  const n = pick([4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 30, 40, 50]);
  return {
    question: `${n} × 15`,
    answer: n * 15,
    trick: "×15 = ×10 + moitié de ×10",
    explanation: `<b>Truc :</b> 15 = 10 + 5 = 10 + (10 ÷ 2).<br>
      <span class="step">${n} × 10 = ${n*10}</span>
      <span class="step">moitié = ${n*5}</span>
      <span class="step">${n*10} + ${n*5} = <b>${n*15}</b></span>`
  };
}

function gen_x4() {
  const n = rng(11, 99);
  return {
    question: `${n} × 4`,
    answer: n * 4,
    trick: "×4 = double du double",
    explanation: `<b>Truc :</b> ×4, c'est doubler deux fois.<br>
      <span class="step">${n} × 2 = ${n*2}</span>
      <span class="step">${n*2} × 2 = <b>${n*4}</b></span>`
  };
}

function gen_x8() {
  const n = rng(11, 60);
  return {
    question: `${n} × 8`,
    answer: n * 8,
    trick: "×8 = triple double",
    explanation: `<b>Truc :</b> ×8, c'est doubler trois fois.<br>
      <span class="step">${n} × 2 = ${n*2}</span>
      <span class="step">× 2 = ${n*4}</span>
      <span class="step">× 2 = <b>${n*8}</b></span>`
  };
}

function gen_mult_mix() {
  return pick([gen_x5, gen_x50, gen_x25, gen_x9, gen_x11_simple, gen_x15, gen_x4, gen_x8])();
}

function gen_mult_long() {
  // chaîne genre : a × 5 × 4 = a × 20
  const a = rng(11, 99);
  const pattern = pick([
    { ops: '× 5 × 2', val: 10, hint: '×5×2 = ×10' },
    { ops: '× 5 × 4', val: 20, hint: '×5×4 = ×20' },
    { ops: '× 25 × 4', val: 100, hint: '×25×4 = ×100 !' },
    { ops: '× 50 × 2', val: 100, hint: '×50×2 = ×100' },
    { ops: '× 2 × 5 × 10', val: 100, hint: '×2×5×10 = ×100' },
    { ops: '× 4 × 25', val: 100, hint: '×4×25 = ×100' },
    { ops: '× 8 × 125', val: 1000, hint: '×8×125 = ×1000 (à connaître !)' },
  ]);
  return {
    question: `${a} ${pattern.ops}`,
    answer: a * pattern.val,
    trick: "Regrouper pour faire un nombre rond",
    explanation: `<b>Astuce :</b> change l'ordre des facteurs pour faire ${pattern.val} d'un coup !<br>
      <span class="step">${pattern.hint}</span>
      <span class="step">${a} × ${pattern.val} = <b>${a * pattern.val}</b></span>`
  };
}

/* ---------- MONDE 4 : DÉCOMPOSITION (additions / soustractions) ---------- */

function gen_add_decomp() {
  // 47 + 38 = 47 + 40 - 2
  const a = rng(13, 88);
  const b = rng(11, 78);
  const round = Math.round(b / 10) * 10;
  const diff = b - round;
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    trick: "Décomposer par la dizaine",
    explanation: `<b>Idée :</b> arrondis ${b} à la dizaine la plus proche.<br>
      <span class="step">${b} ≈ <b>${round}</b> (${diff >= 0 ? '+' : '−'} ${Math.abs(diff)})</span>
      <span class="step">${a} + ${round} = ${a + round}</span>
      <span class="step">${a + round} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)} = <b>${a + b}</b></span>`
  };
}

function gen_sub_decomp() {
  // 83 - 29 = 83 - 30 + 1
  const a = rng(40, 99);
  const b = rng(11, a - 5);
  const round = Math.round(b / 10) * 10;
  const diff = b - round;
  return {
    question: `${a} − ${b}`,
    answer: a - b,
    trick: "Soustraire par la dizaine",
    explanation: `<b>Idée :</b> arrondis ${b} à la dizaine.<br>
      <span class="step">${b} = ${round} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)}</span>
      <span class="step">${a} − ${round} = ${a - round}</span>
      <span class="step">${a - round} ${diff >= 0 ? '−' : '+'} ${Math.abs(diff)} = <b>${a - b}</b> <i>(on inverse le signe)</i></span>`
  };
}

function gen_add_friends() {
  // 25 + 13 + 75 → regrouper 25+75
  const pairs = [[25, 75], [13, 87], [40, 60], [22, 78], [35, 65], [12, 88], [45, 55], [60, 40]];
  const [a, c] = pick(pairs);
  const b = rng(11, 99);
  // Mélanger l'ordre
  const triple = shuffle([a, b, c]);
  return {
    question: `${triple[0]} + ${triple[1]} + ${triple[2]}`,
    answer: a + b + c,
    trick: "Repérer les amis (qui font 100)",
    explanation: `<b>Astuce :</b> ${a} et ${c} sont <strong>amis</strong> : ${a} + ${c} = ${a+c} !<br>
      <span class="step">${a} + ${c} = <b>${a+c}</b></span>
      <span class="step">${a+c} + ${b} = <b>${a+b+c}</b></span>`
  };
}

function gen_decomp_long() {
  // Chaîne add/sub à décomposer
  const a = rng(20, 90);
  const b = rng(11, 49);
  const c = rng(11, 49);
  const op2 = pick(['+', '−']);
  const r = op2 === '+' ? a + b + c : a + b - c;
  return {
    question: `${a} + ${b} ${op2} ${c}`,
    answer: r,
    trick: "Calcul long en chaîne",
    explanation: `<b>On avance par étape :</b><br>
      <span class="step">${a} + ${b} = <b>${a+b}</b> (décompose ${b} si besoin)</span>
      <span class="step">${a+b} ${op2} ${c} = <b>${r}</b></span>`
  };
}

/* ---------- MONDE 5 : COMPENSATION ---------- */

function gen_comp_mult() {
  // 98 × 5 = 100×5 - 2×5
  const proches = [98, 99, 101, 102, 198, 199, 201, 202, 49, 51, 99, 101];
  const a = pick(proches);
  const b = pick([3, 4, 5, 6, 7, 8, 9]);
  const round = a < 50 ? 50 : a < 200 ? (a < 150 ? 100 : 200) : 200;
  const diff = a - round;
  return {
    question: `${a} × ${b}`,
    answer: a * b,
    trick: "Compenser autour d'un nombre rond",
    explanation: `<b>Astuce :</b> ${a} est proche de ${round}.<br>
      <span class="step">${a} = ${round} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)}</span>
      <span class="step">${a} × ${b} = ${round} × ${b} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)} × ${b}</span>
      <span class="step">= ${round*b} ${diff >= 0 ? '+' : '−'} ${Math.abs(diff)*b} = <b>${a*b}</b></span>`
  };
}

function gen_comp_sub() {
  // 73 - 28 = 75 - 30 (on ajoute 2 aux deux)
  const a = rng(50, 99);
  const b = rng(15, a - 10);
  const adj = (10 - (b % 10)) % 10 || 10;
  const ra = a + (adj === 10 ? 0 : adj);
  const rb = b + (adj === 10 ? 0 : adj);
  // Si adj = 0 (b déjà multiple de 10), choisis autre cas
  if (adj === 10) return gen_comp_sub();
  return {
    question: `${a} − ${b}`,
    answer: a - b,
    trick: "Soustraction équivalente",
    explanation: `<b>Truc magique :</b> si tu ajoutes le même nombre des deux côtés, la différence ne change pas !<br>
      <span class="step">+${adj} aux deux : ${a} − ${b} = ${ra} − ${rb}</span>
      <span class="step">${ra} − ${rb} = <b>${a-b}</b> (plus facile !)</span>`
  };
}

function gen_comp_long() {
  const a = pick([98, 99, 102, 49, 51]);
  const b = rng(3, 9);
  const c = rng(2, 9);
  return {
    question: `${a} × ${b} + ${c}`,
    answer: a * b + c,
    trick: "Compenser puis finir",
    explanation: `<span class="step">${a} ≈ ${a < 100 ? 100 : a < 60 ? 50 : 100}</span>
      <span class="step">${a} × ${b} = <b>${a*b}</b></span>
      <span class="step">+ ${c} = <b>${a*b + c}</b></span>`
  };
}

/* ---------- MONDE 6 : DISTRIBUTIVITÉ ---------- */

function gen_dist_simple() {
  // 16 × 7 = 10×7 + 6×7
  const a = rng(11, 19);
  const b = rng(3, 9);
  const d = Math.floor(a/10)*10;
  const u = a % 10;
  return {
    question: `${a} × ${b}`,
    answer: a * b,
    trick: "Distribuer (×7 sur 10+6)",
    explanation: `<b>Méthode :</b> décompose ${a} = ${d} + ${u}.<br>
      <span class="step">${a} × ${b} = (${d} + ${u}) × ${b}</span>
      <span class="step">= ${d} × ${b} + ${u} × ${b}</span>
      <span class="step">= ${d*b} + ${u*b} = <b>${a*b}</b></span>`
  };
}

function gen_dist_med() {
  // 23 × 6 = 20×6 + 3×6
  const a = rng(21, 49);
  const b = rng(3, 9);
  const d = Math.floor(a/10)*10;
  const u = a % 10;
  return {
    question: `${a} × ${b}`,
    answer: a * b,
    trick: "Distribuer dizaines + unités",
    explanation: `<span class="step">${a} = ${d} + ${u}</span>
      <span class="step">${d} × ${b} = ${d*b}</span>
      <span class="step">${u} × ${b} = ${u*b}</span>
      <span class="step">Total : <b>${a*b}</b></span>`
  };
}

function gen_dist_factor() {
  // 17 × 8 + 17 × 2 = 17 × 10
  const a = rng(7, 49);
  const [b1, b2] = pick([[7, 3], [8, 2], [6, 4], [9, 1], [4, 6], [3, 7]]);
  return {
    question: `${a} × ${b1} + ${a} × ${b2}`,
    answer: a * (b1 + b2),
    trick: "Factorisation",
    explanation: `<b>Astuce :</b> ${a} apparaît deux fois !<br>
      <span class="step">= ${a} × (${b1} + ${b2})</span>
      <span class="step">= ${a} × ${b1+b2}</span>
      <span class="step">= <b>${a*(b1+b2)}</b></span>`
  };
}

function gen_dist_long() {
  const a = rng(12, 39);
  const b = rng(3, 9);
  const c = rng(2, 9);
  return {
    question: `${a} × ${b} + ${a} × ${c}`,
    answer: a * (b + c),
    trick: "Factorisation puis calcul",
    explanation: `<span class="step">= ${a} × (${b} + ${c}) = ${a} × ${b+c}</span>
      <span class="step">${a} × ${b+c} = <b>${a*(b+c)}</b> (distribue si besoin)</span>`
  };
}

/* ---------- MONDE 7 : CARRÉS ---------- */

function gen_carre_5() {
  // Truc des nombres en 5 : 35² → 3×4=12 puis "25" → 1225
  const d = rng(1, 9);
  const n = d * 10 + 5;
  return {
    question: `${n} × ${n}`,
    answer: n * n,
    trick: "Carré des nombres en 5",
    explanation: `<b>Truc magique :</b> pour un nombre qui finit par 5, prends sa "dizaine", multiplie-la par la suivante, puis colle "25".<br>
      <span class="step">${d} × ${d+1} = <b>${d*(d+1)}</b></span>
      <span class="step">Colle "25" derrière → <b>${n*n}</b></span>
      <span class="step">Pourquoi ça marche ? (10d+5)² = 100d(d+1)+25</span>`
  };
}

function gen_carre_simple() {
  const n = rng(11, 30);
  return {
    question: `${n} × ${n}`,
    answer: n * n,
    trick: "Carré par décomposition",
    explanation: `<b>Méthode :</b> décompose ${n} en dizaines + unités.<br>
      <span class="step">${n} = ${Math.floor(n/10)*10} + ${n%10}</span>
      <span class="step">${n}² = ${Math.floor(n/10)*10}² + 2×${Math.floor(n/10)*10}×${n%10} + ${n%10}²</span>
      <span class="step">= ${Math.floor(n/10)*10*Math.floor(n/10)*10} + ${2*Math.floor(n/10)*10*(n%10)} + ${(n%10)*(n%10)} = <b>${n*n}</b></span>`
  };
}

function gen_carre_proche100() {
  // proche de 50, 100 ou 200
  const pivot = pick([50, 100, 100, 100, 200]); // 100 plus probable
  const n = pivot + pick([-5,-4,-3,-2,-1,1,2,3,4,5]);
  const d = n - pivot;
  return {
    question: `${n} × ${n}`,
    answer: n * n,
    trick: `Carré proche de ${pivot}`,
    explanation: `<b>Identité :</b> (a+b)² = a² + 2ab + b², avec a=${pivot}, b=${d}.<br>
      <span class="step">${pivot}² = ${pivot*pivot}</span>
      <span class="step">2 × ${pivot} × ${d} = ${2*pivot*d}</span>
      <span class="step">${d}² = ${d*d}</span>
      <span class="step">Somme : ${pivot*pivot} ${2*pivot*d>=0?'+':'−'} ${Math.abs(2*pivot*d)} + ${d*d} = <b>${n*n}</b></span>`
  };
}

/* ---------- MONDE 8 : MIX BOSS ---------- */

function gen_mix_easy() {
  return pick([gen_x10_simple, gen_compl100, gen_x5, gen_x9, gen_add_decomp, gen_sub_decomp])();
}

function gen_mix_med() {
  return pick([gen_x01, gen_div01, gen_compl1000, gen_x25, gen_x11_simple, gen_dist_simple, gen_comp_mult, gen_comp_sub, gen_add_friends])();
}

function gen_mix_hard() {
  return pick([gen_x01, gen_div01, gen_x25, gen_dist_med, gen_dist_factor, gen_comp_mult, gen_carre_5, gen_carre_simple, gen_zeros_long, gen_mult_long])();
}

function gen_mix_boss() {
  return pick([gen_carre_5, gen_carre_proche100, gen_mult_long, gen_zeros_long, gen_dist_long, gen_decomp_long, gen_compl_long, gen_comp_long])();
}

/* ---------- MONDE 9 : CALCULS LONGS (chaînes multi-astuces) ---------- */

function gen_long_chain1() {
  // (a + b) × c où a+b = nombre rond
  const couples = [[37, 13], [48, 12], [62, 38], [25, 75], [44, 56], [15, 85], [22, 78], [33, 67]];
  const [a, b] = pick(couples);
  const c = rng(3, 9);
  return {
    question: `(${a} + ${b}) × ${c}`,
    answer: (a + b) * c,
    trick: "Repérer la somme ronde",
    explanation: `<b>Astuce :</b> ${a} + ${b} fait un nombre rond !<br>
      <span class="step">${a} + ${b} = <b>${a+b}</b></span>
      <span class="step">${a+b} × ${c} = <b>${(a+b)*c}</b></span>`
  };
}

function gen_long_chain2() {
  // a × b × c où b × c = 10 ou 100
  const a = rng(7, 49);
  const [b, c, p] = pick([[2, 5, 10], [4, 25, 100], [5, 20, 100], [25, 8, 200], [50, 2, 100], [125, 8, 1000]]);
  return {
    question: `${a} × ${b} × ${c}`,
    answer: a * p,
    trick: "Regrouper pour ×100/×1000",
    explanation: `<b>Astuce :</b> ${b} × ${c} = ${p} !<br>
      <span class="step">${a} × ${b} × ${c} = ${a} × ${p}</span>
      <span class="step">= <b>${a*p}</b></span>`
  };
}

function gen_long_chain3() {
  // a × 10 + b - c (mix opérations + virgule)
  const a = rng(12, 99);
  const b = rng(11, 99);
  const c = rng(11, 50);
  return {
    question: `${a} × 10 + ${b} − ${c}`,
    answer: a * 10 + b - c,
    trick: "Priorité × puis +/−",
    explanation: `<b>Règle d'or :</b> on fait la multiplication EN PREMIER.<br>
      <span class="step">${a} × 10 = <b>${a*10}</b></span>
      <span class="step">${a*10} + ${b} = ${a*10+b}</span>
      <span class="step">${a*10+b} − ${c} = <b>${a*10+b-c}</b></span>`
  };
}

function gen_long_chain4() {
  // Génération paramétrée : on choisit un "kit" qui donne un pivot rond
  const kits = [
    // 25 × (4k) → 100k
    { base: 25, factor: 4, pivot: 100 },
    // 50 × (2k) → 100k
    { base: 50, factor: 2, pivot: 100 },
    // 125 × (8k) → 1000k
    { base: 125, factor: 8, pivot: 1000 },
    // 75 × (4k) → 300k
    { base: 75, factor: 4, pivot: 300 },
    // 250 × (4k) → 1000k
    { base: 250, factor: 4, pivot: 1000 },
    // 5 × (2k) → 10k
    { base: 5, factor: 2, pivot: 10 },
    // 15 × (2k) → 30k
    { base: 15, factor: 2, pivot: 30 },
    // 20 × (5k) → 100k
    { base: 20, factor: 5, pivot: 100 },
    // 8 × (125k) → 1000k mais on inverse
    { base: 8, factor: 125, pivot: 1000 },
    // 4 × (25k) → 100k inversé
    { base: 4, factor: 25, pivot: 100 },
  ];
  const k = pick(kits);
  const m = rng(2, 9);
  const other = k.factor * m;
  return {
    question: `${k.base} × ${other}`,
    answer: k.base * other,
    trick: "Décomposer pour arriver à 100/1000",
    explanation: `<b>Idée :</b> repère le facteur qui te mène à un nombre rond avec ${k.base}.<br>
      <span class="step">${other} = ${k.factor} × ${m}</span>
      <span class="step">${k.base} × ${other} = ${k.base} × ${k.factor} × ${m} = ${k.pivot} × ${m}</span>
      <span class="step">= <b>${k.pivot * m}</b></span>`
  };
}

function gen_long_marathon() {
  // Marathon de 4 opérations
  const a = rng(15, 50);
  const b = rng(11, 30);
  const c = pick([5, 10, 20, 25, 50]);
  const r = (a + b) * c / 10;
  // (a+b) × c puis ÷10
  return {
    question: `(${a} + ${b}) × ${c} ÷ 10`,
    answer: r,
    trick: "Marathon — chaîne complète",
    explanation: `<span class="step">${a} + ${b} = <b>${a+b}</b></span>
      <span class="step">${a+b} × ${c} = <b>${(a+b)*c}</b></span>
      <span class="step">${(a+b)*c} ÷ 10 = <b>${fmt(r)}</b></span>`
  };
}

function gen_long_priority() {
  // Mélange avec parenthèses et priorités
  const a = rng(10, 50);
  const b = rng(2, 9);
  const c = rng(2, 9);
  const d = rng(10, 50);
  return {
    question: `${a} + ${b} × ${c} − ${d} ÷ 2`,
    answer: a + b * c - d / 2,
    trick: "Priorités opératoires",
    explanation: `<b>Règle :</b> × et ÷ AVANT + et −.<br>
      <span class="step">${b} × ${c} = ${b*c}</span>
      <span class="step">${d} ÷ 2 = ${fmt(d/2)}</span>
      <span class="step">${a} + ${b*c} − ${fmt(d/2)} = <b>${fmt(a + b*c - d/2)}</b></span>`
  };
}

function gen_long_mix() {
  return pick([gen_long_chain1, gen_long_chain2, gen_long_chain3, gen_long_chain4, gen_long_marathon, gen_long_priority])();
}


/* ============================================================
   STRUCTURE DES MONDES
   ============================================================ */

const WORLDS = [
  /* ---- MONDE 1 ---- */
  {
    id: 'zeros',
    name: 'Le Monde des Zéros',
    emoji: '🌍',
    color: '#4cc9f0',
    description: "Multiplie et divise par 10, 100, 1000 — et leurs petits cousins 0,1, 0,01, 0,001. Tout n'est qu'une histoire de virgule qui se déplace !",
    lesson: `
      <h3>🌍 Le Monde des Zéros</h3>
      <p>Quand on multiplie ou divise par 10, 100, 1000... la <strong>virgule se déplace</strong>. C'est tout !</p>

      <h4>✖️ Multiplier</h4>
      <ul>
        <li><b>×10</b> → virgule décalée de <b>1 rang à droite</b></li>
        <li><b>×100</b> → 2 rangs à droite</li>
        <li><b>×1000</b> → 3 rangs à droite</li>
      </ul>
      <div class="ex"><b>Exemple :</b> 4,5 × 100 = 450 (virgule de 2 rangs)</div>

      <h4>➗ Diviser</h4>
      <ul>
        <li><b>÷10</b> → virgule de <b>1 rang à gauche</b></li>
        <li><b>÷100</b> → 2 rangs à gauche</li>
      </ul>
      <div class="ex"><b>Exemple :</b> 230 ÷ 100 = 2,3</div>

      <h4>🪄 Le truc qui fait peur</h4>
      <p>Multiplier par <code>0,1</code>, <code>0,01</code>, <code>0,001</code> ?</p>
      <div class="tip"><b>×0,1 = ÷10</b><br><b>×0,01 = ÷100</b><br><b>×0,001 = ÷1000</b><br>Et inversement : <b>÷0,1 = ×10</b> !</div>
      <div class="ex"><b>Exemple :</b> 47 × 0,01 = 0,47 — la virgule recule de 2 rangs.</div>

      <h4>💡 À retenir</h4>
      <p>Le nombre de zéros (ou de chiffres après la virgule) = nombre de rangs à décaler. Toujours.</p>
    `,
    stages: [
      { name: 'Échauffement', desc: '×10, ×100, ×1000 simples', count: 15, gen: gen_x10_simple, drillKey: 'x10' },
      { name: 'Décimaux', desc: 'avec des virgules', count: 15, gen: gen_x10_decimal, drillKey: 'x10dec' },
      { name: 'Divisions', desc: '÷10, ÷100, ÷1000', count: 15, gen: gen_div10, drillKey: 'div10' },
      { name: 'Le piège des virgules', desc: '×0,1, ×0,01, ×0,001', count: 15, gen: gen_x01, drillKey: 'x01' },
      { name: 'Diviser par 0,1', desc: 'le truc magique', count: 15, gen: gen_div01, drillKey: 'div01' },
      { name: '⚡ Drill 50', desc: '50 ×0,1 ÷0,1 d\'affilée — forge la vitesse', count: 50, gen: () => pick([gen_x01, gen_div01])(), drill: true },
      { name: 'Marathon', desc: 'chaînes longues', count: 10, gen: gen_zeros_long },
    ]
  },

  /* ---- MONDE 2 ---- */
  {
    id: 'compl',
    name: 'Compléments Express',
    emoji: '⚡',
    color: '#ffd166',
    description: "À 10, à 100, à 1000... La compétence reine du calcul mental. Avec ça, on devient une fusée !",
    lesson: `
      <h3>⚡ Compléments Express</h3>
      <p>Trouver le complément, c'est trouver <strong>"combien il manque"</strong> pour atteindre un nombre rond.</p>

      <h4>📌 À 10 (par cœur !)</h4>
      <p>1+9 · 2+8 · 3+7 · 4+6 · 5+5</p>

      <h4>📌 À 100 — l'astuce des matheux</h4>
      <ul>
        <li>Les <b>dizaines</b> font <b>9</b> ensemble</li>
        <li>Les <b>unités</b> font <b>10</b></li>
      </ul>
      <div class="ex"><b>Exemple :</b> 47 + ? = 100<br>
        Dizaines : 4 + <b>5</b> = 9 ✓<br>
        Unités : 7 + <b>3</b> = 10 ✓<br>
        Réponse : <b>53</b></div>
      <div class="tip">⚠️ Si l'unité finit par 0, tu prends 0 d'unité ET les dizaines font 10 ensemble. Ex: 70 + 30 = 100.</div>

      <h4>📌 À 1000</h4>
      <p>Centaines font 9, dizaines font 9, unités font 10.</p>
      <div class="ex"><b>Exemple :</b> 347 + ? = 1000 → 6_5_3 → <b>653</b></div>

      <h4>🎯 À l'entier suivant (décimaux)</h4>
      <div class="ex">3,7 + ? = 4 → il manque 0,3</div>

      <h4>💡 À quoi ça sert ?</h4>
      <p>Beaucoup ! Pour rendre la monnaie, pour soustraire vite, pour faire des regroupements astucieux.</p>
    `,
    stages: [
      { name: 'À 10', desc: 'les bases (par cœur)', count: 15, gen: gen_compl10, drillKey: 'compl10' },
      { name: 'À 100', desc: 'classique', count: 15, gen: gen_compl100, drillKey: 'compl100' },
      { name: 'À la dizaine', desc: 'compléter à 30, 40, 50...', count: 15, gen: gen_compl_to_round, drillKey: 'complRound' },
      { name: 'À 1000', desc: 'la cour des grands', count: 15, gen: gen_compl1000, drillKey: 'compl1000' },
      { name: 'Décimaux', desc: 'compléter à 1', count: 15, gen: gen_compl_decimal, drillKey: 'complDec' },
      { name: '⚡ Drill 50', desc: '50 compléments à 100 — automatisation totale', count: 50, gen: gen_compl100, drill: true },
      { name: 'Marathon', desc: 'somme + complément', count: 10, gen: gen_compl_long },
    ]
  },

  /* ---- MONDE 3 ---- */
  {
    id: 'mult',
    name: 'Astuces Multiplication',
    emoji: '💎',
    color: '#b794f4',
    description: "×5, ×9, ×11, ×25, ×50... Toutes les multiplications ont leur truc secret. Apprends-les tous !",
    lesson: `
      <h3>💎 Astuces de Multiplication</h3>

      <h4>×5 = ×10 ÷ 2</h4>
      <div class="ex">42 × 5 → 42 × 10 = 420 → ÷ 2 = <b>210</b></div>

      <h4>×50 = ×100 ÷ 2</h4>
      <div class="ex">36 × 50 → 36 × 100 = 3600 → ÷ 2 = <b>1800</b></div>

      <h4>×25 = ×100 ÷ 4</h4>
      <div class="ex">16 × 25 → 16 × 100 = 1600 → ÷ 4 = <b>400</b></div>

      <h4>×9 = ×10 − le nombre</h4>
      <div class="ex">7 × 9 → 7 × 10 = 70 → − 7 = <b>63</b></div>

      <h4>×11 (le truc magique des 2 chiffres)</h4>
      <p>Pour <b>ab × 11</b> : on écrit <b>a (a+b) b</b>.</p>
      <div class="ex">52 × 11 → 5 (5+2) 2 = <b>572</b></div>
      <div class="tip">Si a+b ≥ 10, on retient 1 sur la dizaine. Ex: 87 × 11 → 8 (15) 7 → 957.</div>

      <h4>×15 = ×10 + moitié</h4>
      <div class="ex">12 × 15 → 120 + 60 = <b>180</b></div>

      <h4>×4 = double du double</h4>
      <div class="ex">17 × 4 → 17 × 2 = 34 → × 2 = <b>68</b></div>

      <h4>×8 = doubler 3 fois</h4>
      <div class="ex">13 × 8 → 26 → 52 → <b>104</b></div>

      <h4>🚀 Combos</h4>
      <p><b>×125 = ×1000 ÷ 8</b> · <b>×75 = ×100 × 3/4</b> · <b>×125 × 8 = ×1000</b> (à connaître par cœur !)</p>
    `,
    stages: [
      { name: 'Le pouvoir du ×5', desc: '×10 ÷ 2', count: 15, gen: gen_x5, drillKey: 'x5' },
      { name: 'Le ×9 malin', desc: '×10 − n', count: 15, gen: gen_x9, drillKey: 'x9' },
      { name: 'Le ×11 magique', desc: 'truc des 2 chiffres', count: 15, gen: gen_x11_simple, drillKey: 'x11' },
      { name: '×25 et ×50', desc: 'amis de 100', count: 15, gen: () => pick([gen_x25, gen_x50])(), drillKey: 'x25_50' },
      { name: '×4 et ×8', desc: 'doublage en série', count: 15, gen: () => pick([gen_x4, gen_x8])(), drillKey: 'x4_8' },
      { name: '⚡ Drill 50 ×9', desc: '50 ×9 d\'affilée — automatisation', count: 50, gen: gen_x9, drill: true },
      { name: '⚡ Drill 50 ×11', desc: '50 ×11 — devient instantané', count: 50, gen: gen_x11_simple, drill: true },
      { name: '⚡ Drill 50 ×25', desc: '50 ×25 — réflexe ×100÷4', count: 50, gen: gen_x25, drill: true },
      { name: 'Mix multiplications', desc: 'tout mélangé', count: 15, gen: gen_mult_mix },
      { name: 'Marathon', desc: 'chaînes ×5×4, ×8×125...', count: 10, gen: gen_mult_long },
    ]
  },

  /* ---- MONDE 4 ---- */
  {
    id: 'decomp',
    name: 'Décomposition',
    emoji: '🔥',
    color: '#ff6b9d',
    description: "Casser un nombre pour mieux calculer. La technique préférée des champions.",
    lesson: `
      <h3>🔥 Décomposition</h3>
      <p>Quand un calcul a l'air dur, on <strong>casse un nombre en morceaux faciles</strong>.</p>

      <h4>Addition par la dizaine</h4>
      <div class="ex">47 + 38 → on arrondit 38 à 40<br>
        47 + 40 = 87<br>
        Mais on a ajouté 2 en trop : 87 − 2 = <b>85</b></div>

      <h4>Soustraction par la dizaine</h4>
      <div class="ex">83 − 29 → 29 ≈ 30<br>
        83 − 30 = 53<br>
        On a enlevé 1 en trop : 53 + 1 = <b>54</b></div>
      <div class="tip">⚠️ Quand on arrondit le nombre qu'on enlève, on <b>inverse</b> la correction à la fin.</div>

      <h4>Repérer les amis (qui font 100)</h4>
      <div class="ex">25 + 47 + 75 → 25 et 75 sont amis !<br>
        25 + 75 = 100<br>
        100 + 47 = <b>147</b></div>

      <h4>💡 La clé</h4>
      <p>Toujours chercher : <i>"comment puis-je rendre ce calcul plus simple ?"</i> Souvent : décomposer un nombre en (dizaine + reste).</p>
    `,
    stages: [
      { name: 'Additions malines', desc: 'décomposer pour ajouter', count: 15, gen: gen_add_decomp, drillKey: 'addDecomp' },
      { name: 'Soustractions', desc: 'décomposer pour enlever', count: 15, gen: gen_sub_decomp, drillKey: 'subDecomp' },
      { name: 'Repérer les amis', desc: 'sommes qui font 100', count: 15, gen: gen_add_friends, drillKey: 'friends' },
      { name: '⚡ Drill 50', desc: '50 add/sub décomposées', count: 50, gen: () => pick([gen_add_decomp, gen_sub_decomp])(), drill: true },
      { name: 'Mix décomposition', desc: 'add et sub', count: 15, gen: () => pick([gen_add_decomp, gen_sub_decomp, gen_add_friends])() },
      { name: 'Marathon', desc: 'chaînes longues', count: 10, gen: gen_decomp_long },
    ]
  },

  /* ---- MONDE 5 ---- */
  {
    id: 'comp',
    name: 'Compensation',
    emoji: '🌟',
    color: '#06d6a0',
    description: "98 × 5 ? Trop dur ? 100 × 5, ça je sais ! Le truc des grands.",
    lesson: `
      <h3>🌟 Compensation</h3>
      <p>Quand un nombre est <strong>proche d'un nombre rond</strong>, on calcule avec le rond et on rectifie.</p>

      <h4>En multiplication</h4>
      <div class="ex">98 × 5 → 100 × 5 = 500<br>
        On a multiplié 2 fois en trop : −2 × 5 = −10<br>
        Réponse : <b>490</b></div>
      <div class="ex">102 × 7 → 100 × 7 = 700<br>
        +2 × 7 = +14 → <b>714</b></div>

      <h4>Soustraction équivalente (le truc fou)</h4>
      <p>Si tu ajoutes la <strong>même chose</strong> aux deux nombres d'une soustraction, le résultat ne change pas !</p>
      <div class="ex">73 − 28 → +2 aux deux → 75 − 30 = <b>45</b></div>
      <div class="ex">83 − 47 → +3 aux deux → 86 − 50 = <b>36</b></div>

      <h4>💡 Pourquoi ?</h4>
      <p>L'écart entre deux nombres reste le même si on les avance tous les deux du même pas.</p>
    `,
    stages: [
      { name: 'Multiplications', desc: 'autour de 50, 100, 200', count: 15, gen: gen_comp_mult, drillKey: 'compMult' },
      { name: 'Soustractions', desc: 'décaler des deux côtés', count: 15, gen: gen_comp_sub, drillKey: 'compSub' },
      { name: '⚡ Drill 50', desc: '50 compensations — réflexe acquis', count: 50, gen: () => pick([gen_comp_mult, gen_comp_sub])(), drill: true },
      { name: 'Mix compensation', desc: 'tout', count: 15, gen: () => pick([gen_comp_mult, gen_comp_sub])() },
      { name: 'Marathon', desc: 'chaînes', count: 10, gen: gen_comp_long },
    ]
  },

  /* ---- MONDE 6 ---- */
  {
    id: 'dist',
    name: 'Distributivité',
    emoji: '🚀',
    color: '#ef476f',
    description: "Distribuer un facteur, factoriser une expression. Le pouvoir secret du collège.",
    lesson: `
      <h3>🚀 Distributivité</h3>
      <p>La règle la plus puissante des maths : <code>a × (b + c) = a × b + a × c</code></p>

      <h4>Distribuer pour multiplier vite</h4>
      <div class="ex">16 × 7 → décompose 16 = 10 + 6<br>
        = 10 × 7 + 6 × 7<br>
        = 70 + 42<br>
        = <b>112</b></div>

      <div class="ex">23 × 6 = (20 + 3) × 6 = 120 + 18 = <b>138</b></div>

      <h4>Factoriser pour simplifier</h4>
      <p>Quand tu vois un nombre <b>commun</b>, tu le mets devant !</p>
      <div class="ex">17 × 8 + 17 × 2 → 17 × (8+2) = 17 × 10 = <b>170</b></div>
      <div class="ex">35 × 7 − 35 × 2 → 35 × (7−2) = 35 × 5 = <b>175</b></div>

      <h4>💡 Le secret</h4>
      <p>Cherche toujours : "y a-t-il une distributivité ou une factorisation possible qui me donne un nombre rond ?"</p>
    `,
    stages: [
      { name: 'Distribuer ×10+x', desc: 'nombres entre 11 et 19', count: 15, gen: gen_dist_simple, drillKey: 'distSimple' },
      { name: 'Distribuer plus loin', desc: 'jusqu\'à 49', count: 15, gen: gen_dist_med, drillKey: 'distMed' },
      { name: 'Factorisation', desc: 'mettre en facteur', count: 15, gen: gen_dist_factor, drillKey: 'distFactor' },
      { name: '⚡ Drill 50', desc: '50 distributions — devient automatique', count: 50, gen: () => pick([gen_dist_simple, gen_dist_med])(), drill: true },
      { name: 'Marathon', desc: 'chaînes', count: 10, gen: gen_dist_long },
    ]
  },

  /* ---- MONDE 7 ---- */
  {
    id: 'carre',
    name: 'Carrés Magiques',
    emoji: '🎯',
    color: '#9d4edd',
    description: "35² en moins d'une seconde ? Possible ! Le truc des nombres en 5 va t'épater.",
    lesson: `
      <h3>🎯 Carrés Magiques</h3>

      <h4>🪄 Le truc des nombres en 5</h4>
      <p>Pour calculer le carré d'un nombre qui finit par 5 :</p>
      <ul>
        <li>Prends sa "dizaine"</li>
        <li>Multiplie-la par <b>la suivante</b></li>
        <li>Colle "<b>25</b>" derrière</li>
      </ul>
      <div class="ex"><b>35² ?</b><br>
        Dizaine = 3 → 3 × 4 = 12<br>
        Colle 25 → <b>1225</b> ✨</div>
      <div class="ex"><b>75² ?</b><br>
        7 × 8 = 56 → <b>5625</b></div>
      <div class="ex"><b>95² ?</b><br>
        9 × 10 = 90 → <b>9025</b></div>

      <h4>🎓 Carrés près de 100</h4>
      <p>Identité remarquable : (100 + a)² = 10000 + 200a + a²</p>
      <div class="ex">98² = (100−2)² = 10000 − 400 + 4 = <b>9604</b></div>
      <div class="ex">103² = 10000 + 600 + 9 = <b>10609</b></div>

      <h4>Carrés par décomposition</h4>
      <p>Sinon, on décompose : (a+b)² = a² + 2ab + b²</p>
      <div class="ex">23² = 20² + 2×20×3 + 3² = 400 + 120 + 9 = <b>529</b></div>

      <h4>💡 Carrés à connaître par cœur</h4>
      <p>11²=121 · 12²=144 · 13²=169 · 14²=196 · 15²=225 · 16²=256 · 17²=289 · 18²=324 · 19²=361 · 20²=400</p>
    `,
    stages: [
      { name: 'Le truc des 5', desc: '15², 25², 35²...', count: 15, gen: gen_carre_5, drillKey: 'carre5' },
      { name: 'Carrés généraux', desc: 'décomposition', count: 15, gen: gen_carre_simple, drillKey: 'carreSimple' },
      { name: 'Près de 100', desc: '98², 103²...', count: 15, gen: gen_carre_proche100, drillKey: 'carre100' },
      { name: '⚡ Drill 50 (en 5)', desc: '50 carrés en 5 — instinctif', count: 50, gen: gen_carre_5, drill: true },
      { name: 'Marathon', desc: 'tous les carrés', count: 12, gen: () => pick([gen_carre_5, gen_carre_simple, gen_carre_proche100])() },
    ]
  },

  /* ---- MONDE 8 ---- */
  {
    id: 'mix',
    name: 'Mix Boss',
    emoji: '👑',
    color: '#f72585',
    description: "Toutes les astuces, en mode rafale. Pour les vrais pros.",
    lesson: `
      <h3>👑 Mix Boss</h3>
      <p>Tu as appris toutes les astuces ? Maintenant, on les mélange !</p>
      <p>À chaque exercice, demande-toi :</p>
      <ul>
        <li>🌍 Y a-t-il des zéros à déplacer ?</li>
        <li>⚡ Y a-t-il un complément à trouver ?</li>
        <li>💎 L'un des nombres a-t-il une astuce (×5, ×9, ×11, ×25...) ?</li>
        <li>🔥 Puis-je décomposer ?</li>
        <li>🌟 L'un des nombres est-il proche d'un nombre rond (compensation) ?</li>
        <li>🚀 Puis-je distribuer ou factoriser ?</li>
        <li>🎯 Est-ce un carré ?</li>
      </ul>
      <p><b>Le bon réflexe : "quel est le moyen le plus rapide ?"</b></p>
    `,
    stages: [
      { name: 'Mix facile', desc: 'choisir la bonne astuce', count: 10, gen: gen_mix_easy },
      { name: 'Mix moyen', desc: 'tout devient gros', count: 10, gen: gen_mix_med },
      { name: 'Mix difficile', desc: 'pour les pros', count: 10, gen: gen_mix_hard },
      { name: 'Mode Boss', desc: 'le grand mix', count: 12, gen: gen_mix_boss },
    ]
  },

  /* ---- MONDE 11 : FRACTIONS ASTUCIEUSES ---- */
  {
    id: 'frac',
    name: 'Fractions Astucieuses',
    emoji: '🍕',
    color: '#ff8500',
    description: "Le terrain de jeu favori des matheux : simplifier AVANT de calculer. Le truc qui fait gagner 30 secondes par calcul.",
    lesson: `
      <h3>🍕 Fractions Astucieuses</h3>
      <p>Avec les fractions, l'astuce maître est : <strong>simplifier AVANT de calculer</strong>.</p>

      <h4>📌 Diviseur commun express</h4>
      <p>Pour simplifier <code>a/b</code>, cherche le plus grand nombre qui divise <b>les deux</b>.</p>
      <div class="ex">48/36 → 12 divise les deux → 4/3</div>
      <div class="tip">Astuces de divisibilité :<br>
        • Par 2 : si pair<br>
        • Par 3 : si la somme des chiffres est divisible par 3<br>
        • Par 5 : si finit par 0 ou 5<br>
        • Par 9 : somme des chiffres divisible par 9
      </div>

      <h4>🪄 Simplification en croix (le truc magique)</h4>
      <p>Quand tu as <code>(a × b) / (c × d)</code>, tu peux simplifier <strong>en croix</strong> avant de multiplier.</p>
      <div class="ex"><b>(35 × 24) / (14 × 18)</b><br>
        35 et 14 → ÷ 7 → 5 et 2<br>
        24 et 18 → ÷ 6 → 4 et 3<br>
        Reste : (5 × 4) / (2 × 3) = 20/6 = <b>10/3</b></div>

      <h4>💡 Fraction d'un nombre — diviser d'abord !</h4>
      <p>Pour <code>3/4 × 28</code>, ne fais PAS 3 × 28 puis ÷ 4. Trop dur !</p>
      <div class="ex"><b>3/4 × 28</b> → 28 ÷ 4 = 7 → 7 × 3 = <b>21</b></div>

      <h4>💯 Pourcentages = fractions</h4>
      <ul>
        <li>50% = 1/2 (la moitié)</li>
        <li>25% = 1/4 (le quart)</li>
        <li>75% = 3/4 (les trois quarts)</li>
        <li>20% = 1/5</li>
        <li>10% = 1/10</li>
        <li>12,5% = 1/8</li>
      </ul>
      <div class="ex">75% de 80 → 80 × 3/4 → 80÷4 = 20 → ×3 = <b>60</b></div>

      <h4>🔁 Diviser par une fraction = multiplier par l'inverse</h4>
      <div class="ex"><b>24 ÷ 3/4</b> → 24 × 4/3 = 96/3 = <b>32</b></div>

      <h4>🎯 Le facteur caché</h4>
      <p>Certaines fractions ont un facteur magique :</p>
      <ul>
        <li>125 × 8 = 1000 → <b>125/1000 = 1/8</b></li>
        <li>250 × 4 = 1000 → <b>250/1000 = 1/4</b></li>
        <li>625 = 5 × 125, 1000 = 8 × 125 → <b>625/1000 = 5/8</b></li>
      </ul>

      <h4>🚀 La règle d'or</h4>
      <p>AVANT de multiplier ou d'additionner des fractions : <strong>SIMPLIFIE TOUJOURS</strong>. Tu auras des nombres 10× plus petits à manipuler.</p>

      <h4>⌨️ Comment écrire ta réponse</h4>
      <p>Pour répondre une fraction, utilise <code>/</code> entre le numérateur et le dénominateur. Exemple : <b>3/4</b>. Si le résultat est entier, tape juste le nombre.</p>
    `,
    stages: [
      { name: 'Diviseur express', desc: 'Simplifier a/b', count: 12, gen: gen_frac_simplify, drillKey: 'fracSimplify' },
      { name: 'Pourcentages malins', desc: '25%, 50%, 75% comme fractions', count: 12, gen: gen_frac_pct, drillKey: 'fracPct' },
      { name: 'Fraction d\'un nombre', desc: 'Diviser d\'abord !', count: 12, gen: gen_frac_of_number, drillKey: 'fracOfN' },
      { name: 'Diviser par une fraction', desc: 'L\'inverse magique', count: 12, gen: gen_frac_divide_by, drillKey: 'fracDivBy' },
      { name: 'Facteur caché', desc: '125/1000, 75/100...', count: 12, gen: gen_frac_hidden_factor, drillKey: 'fracHidden' },
      { name: 'Simplification en croix', desc: 'Le truc des pros', count: 12, gen: gen_frac_cross, drillKey: 'fracCross' },
      { name: 'Associer pour 1', desc: 'Trios qui se simplifient', count: 10, gen: gen_frac_associate, drillKey: 'fracAssoc' },
      { name: '⚡ Drill 50', desc: 'Simplifications express', count: 50, gen: gen_frac_simplify, drill: true },
      { name: 'Marathon', desc: 'Toutes les astuces fraction', count: 12, gen: gen_frac_marathon },
    ]
  },

  /* ---- MONDE 10 : HISTOIRES (problèmes contextuels) ---- */
  {
    id: 'pb',
    name: 'Histoires & Problèmes',
    emoji: '📖',
    color: '#06d6a0',
    description: "Les maths de la vraie vie : billes, bonbons, euros, partages... Ce sont les calculs qui te servent en classe !",
    lesson: `
      <h3>📖 Histoires & Problèmes</h3>
      <p>Un problème, c'est juste un calcul <strong>déguisé en histoire</strong>. La méthode :</p>

      <h4>1️⃣ Lis bien</h4>
      <p>Repère les <b>nombres</b> et les <b>mots-clés</b> :</p>
      <ul>
        <li>"gagne", "ajoute", "en plus" → <b>+</b></li>
        <li>"perd", "donne", "il reste", "moins" → <b>−</b></li>
        <li>"fois plus", "chacun", "paquets de" → <b>×</b></li>
        <li>"partage", "chacun reçoit" → <b>÷</b></li>
      </ul>

      <h4>2️⃣ Pose le calcul</h4>
      <div class="ex">"Léo a 47 billes, il en gagne 18" → <b>47 + 18</b></div>
      <div class="ex">"3 paquets de 8 bonbons" → <b>3 × 8</b></div>
      <div class="ex">"24 partagés entre 4 amis" → <b>24 ÷ 4</b></div>

      <h4>3️⃣ Applique tes astuces !</h4>
      <p>Une fois le calcul posé, c'est juste du calcul mental. Toutes tes astuces fonctionnent !</p>

      <h4>💡 Le piège des problèmes</h4>
      <p>Lis <b>2 fois</b>. La 1ère fois pour comprendre, la 2ème pour repérer ce qu'on demande. Beaucoup d'erreurs viennent du fait qu'on a mal lu, pas qu'on a mal calculé !</p>
    `,
    stages: [
      { name: 'Additions en histoires', desc: 'Léo gagne, perd, ajoute...', count: 12, gen: gen_pb_simple_add, drillKey: 'pbAdd' },
      { name: 'Soustractions en histoires', desc: 'Il en reste combien ?', count: 12, gen: gen_pb_simple_sub, drillKey: 'pbSub' },
      { name: 'Multiplications', desc: 'Paquets, boîtes, fois plus', count: 12, gen: gen_pb_mult, drillKey: 'pbMult' },
      { name: 'Partages', desc: 'Diviser entre amis', count: 12, gen: gen_pb_div, drillKey: 'pbDiv' },
      { name: 'Pourcentages', desc: 'Soldes, réductions (CM2+)', count: 10, gen: gen_pb_pct, drillKey: 'pbPct' },
      { name: 'Mix histoires', desc: 'Tout mélangé', count: 12, gen: () => gen_pb_mix(3) },
      { name: 'Problèmes longs', desc: 'Plusieurs étapes', count: 10, gen: gen_pb_chain },
    ]
  },

  /* ---- MONDE 9 : CALCULS LONGS ---- */
  {
    id: 'long',
    name: 'Calculs Longs',
    emoji: '🧠',
    color: '#7209b7',
    description: "Plusieurs étapes, plusieurs astuces enchaînées. C'est là qu'on devient un cerveau redoutable !",
    lesson: `
      <h3>🧠 Calculs Longs</h3>
      <p>Quand le calcul est long, on le découpe en <strong>petites étapes faciles</strong>.</p>

      <h4>📌 Règle d'or : les priorités</h4>
      <ol>
        <li><b>Parenthèses</b> d'abord</li>
        <li>× et ÷ ensuite (de gauche à droite)</li>
        <li>+ et − à la fin (de gauche à droite)</li>
      </ol>
      <div class="ex">8 + 3 × 4 → ⚠️ pas 11 × 4 !<br>
        D'abord 3 × 4 = 12<br>
        Puis 8 + 12 = <b>20</b></div>

      <h4>🪄 Repère les paires gagnantes</h4>
      <p>Dans un produit, change l'ordre pour faire 100 ou 1000 :</p>
      <ul>
        <li>2 × 5 = 10</li>
        <li>4 × 25 = 100</li>
        <li>5 × 20 = 100</li>
        <li>2 × 50 = 100</li>
        <li>8 × 125 = 1000</li>
      </ul>
      <div class="ex">7 × 4 × 25 → 7 × (4 × 25) = 7 × 100 = <b>700</b></div>

      <h4>🎯 Décompose pour atteindre 100/1000</h4>
      <div class="ex">25 × 12 = 25 × 4 × 3 = 100 × 3 = <b>300</b></div>
      <div class="ex">125 × 16 = 125 × 8 × 2 = 1000 × 2 = <b>2000</b></div>

      <h4>💡 Avant d'attaquer</h4>
      <p>Regarde le calcul <b>en entier</b>. Pose-toi la question : "y a-t-il une astuce qui me permet d'éviter le calcul direct ?"</p>
    `,
    stages: [
      { name: 'Sommes rondes', desc: '(a+b)×c où a+b est rond', count: 8, gen: gen_long_chain1 },
      { name: 'Triple produit', desc: 'a×b×c en regroupant', count: 8, gen: gen_long_chain2 },
      { name: 'Priorités', desc: 'multi-opérations', count: 8, gen: gen_long_chain3 },
      { name: 'Vers 100/1000', desc: '25×12, 125×16...', count: 8, gen: gen_long_chain4 },
      { name: 'Marathon', desc: 'chaîne complète', count: 8, gen: gen_long_marathon },
      { name: 'Boss final', desc: 'tout mélangé', count: 10, gen: gen_long_mix },
    ]
  },
];

/* ============================================================
   GÉNÉRATEUR pour défi du jour / survie / boss
   ============================================================ */

/* Difficulté pour le mode Challenge Chrono d'un stage donné */
function challengeGenForStage(world, stageIdx) {
  const baseStage = world.stages[stageIdx];
  return baseStage.gen;
}

function gen_daily(level) {
  // mélange progressif selon le niveau du joueur
  if (level <= 2) return gen_mix_easy();
  if (level <= 5) return pick([gen_mix_easy, gen_mix_med])();
  if (level <= 10) return gen_mix_med();
  if (level <= 15) return pick([gen_mix_med, gen_mix_hard])();
  return pick([gen_mix_hard, gen_mix_boss, gen_long_mix])();
}

function gen_survival(survived) {
  if (survived < 3) return gen_mix_easy();
  if (survived < 8) return gen_mix_med();
  if (survived < 15) return gen_mix_hard();
  return pick([gen_mix_boss, gen_long_mix])();
}

/* Trophées */
const TROPHIES = [
  { id: 'first_blood', emoji: '🎯', name: 'Premier exercice', desc: 'Bienvenue !' },
  { id: 'world1_done', emoji: '🌍', name: 'Maître des Zéros', desc: 'Termine le Monde 1' },
  { id: 'world2_done', emoji: '⚡', name: 'Maître des Compléments', desc: 'Termine le Monde 2' },
  { id: 'world3_done', emoji: '💎', name: 'Maître Multiplication', desc: 'Termine le Monde 3' },
  { id: 'world4_done', emoji: '🔥', name: 'Maître Décomposition', desc: 'Termine le Monde 4' },
  { id: 'world5_done', emoji: '🌟', name: 'Maître Compensation', desc: 'Termine le Monde 5' },
  { id: 'world6_done', emoji: '🚀', name: 'Maître Distributivité', desc: 'Termine le Monde 6' },
  { id: 'world7_done', emoji: '🎯', name: 'Maître des Carrés', desc: 'Termine le Monde 7' },
  { id: 'world8_done', emoji: '👑', name: 'Boss Suprême', desc: 'Termine le Monde 8' },
  { id: 'world9_done', emoji: '🧠', name: 'Cerveau d\'Or', desc: 'Termine le Monde 9' },
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
  { id: 'rapid_fire', emoji: '🚀', name: 'Tir Rapide', desc: '5 réponses en moins de 3s chacune' },
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
  { level: 5,  name: 'Calculateur',       emoji: '✏️', color: '#4cc9f0' },
  { level: 10, name: 'Stratège',          emoji: '🎯', color: '#7209b7' },
  { level: 15, name: 'Tacticien',         emoji: '⚔️', color: '#b794f4' },
  { level: 20, name: 'Virtuose',          emoji: '🎼', color: '#ffd166' },
  { level: 30, name: 'Maître',            emoji: '🧙', color: '#ff6b9d' },
  { level: 40, name: 'Sage',              emoji: '🦉', color: '#f72585' },
  { level: 50, name: 'Champion',          emoji: '🏆', color: '#ff8500' },
  { level: 65, name: 'Héros',             emoji: '⭐', color: '#ffd700' },
  { level: 80, name: 'Légende',           emoji: '👑', color: '#ff006e' },
  { level: 100,name: 'Mythe',             emoji: '🌟', color: '#ff0080' },
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
   timeFast  : <= ce temps → l'astuce a été utilisée (réflexe)  → 💎 MAÎTRISÉ
   timeOk    : entre fast et ok → bon mais sans l'astuce         → ✅ CORRECT
   au-delà   : calcul brut                                       → 🐢 LENT
   Le seuil est ATTACHÉ AU GÉNÉRATEUR (drillKey ou nom de stage). */
const TIME_THRESHOLDS = {
  // Monde Zéros
  x10:        { fast: 2.0, ok: 4.0, label: 'Déplacer la virgule' },
  x10dec:     { fast: 2.5, ok: 5.0, label: 'Déplacer la virgule (décimal)' },
  div10:      { fast: 2.0, ok: 4.0, label: 'Déplacer la virgule à gauche' },
  x01:        { fast: 2.5, ok: 5.0, label: '×0,1 = ÷10' },
  div01:      { fast: 2.5, ok: 5.0, label: '÷0,1 = ×10' },
  // Compléments
  compl10:    { fast: 1.8, ok: 3.5, label: 'Complément à 10' },
  compl100:   { fast: 3.0, ok: 6.0, label: 'Complément à 100' },
  complRound: { fast: 2.5, ok: 5.0, label: 'Complément à la dizaine' },
  compl1000:  { fast: 4.0, ok: 8.0, label: 'Complément à 1000' },
  complDec:   { fast: 2.5, ok: 5.0, label: 'Complément à 1' },
  // Multiplications astucieuses
  x5:         { fast: 4.0, ok: 7.0, label: '×5 = ×10÷2' },
  x9:         { fast: 4.0, ok: 8.0, label: '×9 = ×10−n' },
  x11:        { fast: 4.0, ok: 9.0, label: '×11 (truc des 2 chiffres)' },
  x25_50:     { fast: 4.5, ok: 9.0, label: '×25 ou ×50' },
  x4_8:       { fast: 4.0, ok: 8.0, label: 'Doublage en série' },
  // Décomposition
  addDecomp:  { fast: 4.0, ok: 8.0, label: 'Décomposition addition' },
  subDecomp:  { fast: 4.5, ok: 9.0, label: 'Décomposition soustraction' },
  friends:    { fast: 5.0, ok: 10.0, label: 'Repérer les amis (100)' },
  // Compensation
  compMult:   { fast: 5.0, ok: 10.0, label: 'Compensation multiplication' },
  compSub:    { fast: 4.5, ok: 9.0, label: 'Soustraction équivalente' },
  // Distributivité
  distSimple: { fast: 5.0, ok: 10.0, label: 'Distributivité' },
  distMed:    { fast: 6.0, ok: 12.0, label: 'Distributivité +' },
  distFactor: { fast: 6.0, ok: 12.0, label: 'Factorisation' },
  // Carrés
  carre5:     { fast: 4.0, ok: 8.0, label: 'Carré en 5' },
  carreSimple:{ fast: 7.0, ok: 14.0, label: 'Carré décomposé' },
  carre100:   { fast: 6.0, ok: 12.0, label: 'Carré près de 100' },
  // Fractions (lecture + simplification, on est tolérants)
  fracSimplify: { fast: 5.0, ok: 10.0, label: 'Diviseur commun' },
  fracPct:      { fast: 5.0, ok: 10.0, label: 'Pourcentage = fraction' },
  fracOfN:      { fast: 5.0, ok: 10.0, label: 'Fraction d\'un nombre' },
  fracDivBy:    { fast: 6.0, ok: 12.0, label: 'Diviser par fraction' },
  fracHidden:   { fast: 5.0, ok: 10.0, label: 'Facteur caché' },
  fracCross:    { fast: 8.0, ok: 16.0, label: 'Simplification en croix' },
  fracAssoc:    { fast: 8.0, ok: 16.0, label: 'Association' },
  // Problèmes (lecture lente, on est tolérants)
  pbAdd:      { fast: 7.0, ok: 14.0, label: 'Problème addition' },
  pbSub:      { fast: 7.0, ok: 14.0, label: 'Problème soustraction' },
  pbMult:     { fast: 8.0, ok: 16.0, label: 'Problème multiplication' },
  pbDiv:      { fast: 7.0, ok: 14.0, label: 'Problème partage' },
  pbPct:      { fast: 8.0, ok: 16.0, label: 'Problème pourcentage' },
  // Fallback générique
  _default:   { fast: 6.0, ok: 12.0, label: 'Calcul mental' },
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
  { level: 5,  emoji: '👓',   name: 'Lunettes de matheux' },
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

/* ===== GÉNÉRATEUR DE PROBLÈMES (Mode Histoires) ===== */
const NAMES = ['Léo','Lucas','Emma','Lina','Sami','Maya','Tom','Inès','Hugo','Mia','Alix','Noah','Jade','Yann','Sara','Léa','Adam','Anna','Théo','Lou'];
const ITEMS_COUNT = ['billes','bonbons','cartes','euros','pages','élèves','points','gommes','crayons','timbres','fleurs','perles','autocollants','figurines'];
const PLACES = ['à la récré','dans son sac','dans la cour','au goûter','en classe','à la kermesse','au marché','à la boulangerie','en sortie scolaire'];

function gen_pb_simple_add() {
  const n1 = NAMES[rng(0, NAMES.length-1)];
  const it = ITEMS_COUNT[rng(0, ITEMS_COUNT.length-1)];
  const a = rng(15, 79);
  const b = rng(13, 49);
  return {
    question: `${n1} a ${a} ${it}. Il en gagne ${b}. Combien en a-t-il maintenant ?`,
    answer: a + b,
    trick: "Problème — addition",
    explanation: `<b>On lit :</b> ${n1} a ${a}, il en gagne ${b}. "Gagner" = on ajoute.<br>
      <span class="step">${a} + ${b} = <b>${a+b}</b></span>
      <span class="step">Astuce : décompose ${b} → ${Math.round(b/10)*10} ${b%10===0?'':b - Math.round(b/10)*10>=0?'+ '+(b - Math.round(b/10)*10):'− '+Math.abs(b - Math.round(b/10)*10)}</span>`
  };
}

function gen_pb_simple_sub() {
  const n1 = pick(NAMES);
  const it = pick(ITEMS_COUNT);
  const a = rng(40, 99);
  const b = rng(13, a - 10);
  return {
    question: `${n1} avait ${a} ${it}. Il en perd ${b}. Combien lui en reste-t-il ?`,
    answer: a - b,
    trick: "Problème — soustraction",
    explanation: `<b>On lit :</b> ${n1} avait ${a}, il en perd ${b}. "Perdre" = on enlève.<br>
      <span class="step">${a} − ${b} = <b>${a-b}</b></span>
      <span class="step">Astuce : arrondis ${b} à la dizaine la plus proche pour aller plus vite.</span>`
  };
}

function gen_pb_mult() {
  const n1 = pick(NAMES);
  const it = pick(['paquets','boîtes','sachets','boîtes','pots']);
  const each = pick(['bonbons','billes','crayons','autocollants','timbres']);
  const nb = rng(3, 12);
  const per = pick([4, 5, 8, 9, 11, 25]);
  return {
    question: `${n1} achète ${nb} ${it} de ${per} ${each}. Combien de ${each} en tout ?`,
    answer: nb * per,
    trick: "Problème — multiplication",
    explanation: `<b>On lit :</b> ${nb} paquets × ${per} ${each} chacun.<br>
      <span class="step">${nb} × ${per} = <b>${nb*per}</b></span>
      <span class="step">Astuce : ${per === 5 ? '×5 = ×10÷2' : per === 9 ? '×9 = ×10−n' : per === 11 ? '×11 (truc des 2 chiffres)' : per === 25 ? '×25 = ×100÷4' : 'décompose si besoin'}</span>`
  };
}

function gen_pb_div() {
  const n1 = pick(NAMES);
  const it = pick(['bonbons','billes','euros','cartes']);
  const friends = rng(2, 8);
  const eachShare = rng(5, 25);
  const total = friends * eachShare;
  return {
    question: `${n1} partage ${total} ${it} entre ${friends} amis. Combien chacun reçoit-il ?`,
    answer: eachShare,
    trick: "Problème — partage (division)",
    explanation: `<b>On lit :</b> ${total} à partager entre ${friends}.<br>
      <span class="step">${total} ÷ ${friends} = <b>${eachShare}</b></span>
      <span class="step">Astuce : cherche combien de fois ${friends} entre dans ${total}.</span>`
  };
}

function gen_pb_pct() {
  const n1 = pick(NAMES);
  const total = pick([20, 50, 100, 200, 80, 60, 40]);
  const pct = pick([10, 25, 50, 75]);
  const r = total * pct / 100;
  return {
    question: `${n1} a un objet à ${total}€ avec ${pct}% de réduction. Combien d'économies ?`,
    answer: r,
    trick: "Problème — pourcentage",
    explanation: `<b>${pct}% de ${total}</b><br>
      <span class="step">${pct === 50 ? 'Moitié' : pct === 25 ? 'Quart' : pct === 75 ? '3/4' : 'Dixième'} de ${total}</span>
      <span class="step">= <b>${r}</b>€</span>`
  };
}

function gen_pb_chain() {
  const n1 = pick(NAMES);
  const it = pick(ITEMS_COUNT);
  const a = rng(10, 30);
  const b = rng(2, 5);
  const c = rng(5, 15);
  return {
    question: `${n1} a ${a} ${it}. Il en gagne ${b} fois plus, puis donne ${c}. Combien lui en reste-t-il ?`,
    answer: a + a*b - c,
    trick: "Problème — calcul long",
    explanation: `<span class="step">${b} fois plus que ${a} = ${a*b}</span>
      <span class="step">${a} + ${a*b} = ${a + a*b}</span>
      <span class="step">${a + a*b} − ${c} = <b>${a + a*b - c}</b></span>`
  };
}

function gen_pb_mix(level = 1) {
  if (level === 1) return pick([gen_pb_simple_add, gen_pb_simple_sub])();
  if (level === 2) return pick([gen_pb_simple_add, gen_pb_simple_sub, gen_pb_mult])();
  if (level === 3) return pick([gen_pb_mult, gen_pb_div, gen_pb_simple_sub])();
  if (level === 4) return pick([gen_pb_mult, gen_pb_div, gen_pb_pct])();
  return pick([gen_pb_chain, gen_pb_pct, gen_pb_div, gen_pb_mult])();
}

/* ============================================================
   GÉNÉRATEURS — FRACTIONS ASTUCIEUSES
   ============================================================ */

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

/* Format fraction sortie : "a/b" si b > 1, sinon "a" */
function fmtFrac(a, b) {
  if (b === 1) return a.toString();
  if (a === 0) return '0';
  return `${a}/${b}`;
}

/* Compare réponse user en fraction "a/b" ou "a,b" décimal à attendu (a, b) */
function fracEquals(userStr, expA, expB) {
  if (!userStr) return false;
  const s = userStr.replace(',', '.').trim();
  if (s.includes('/')) {
    const [n, d] = s.split('/').map(x => parseFloat(x));
    if (isNaN(n) || isNaN(d) || d === 0) return false;
    // Comparer en valeur
    return Math.abs(n / d - expA / expB) < 1e-6;
  }
  const v = parseFloat(s);
  if (isNaN(v)) return false;
  return Math.abs(v - expA / expB) < 1e-6;
}

/* Stage 1 : Diviseur commun express — simplifier a/b */
function gen_frac_simplify() {
  // On choisit un PGCD "trouvable" (2..12) et deux nombres premiers entre eux
  const gcdVal = pick([2, 3, 4, 5, 6, 7, 8, 9, 12]);
  const small = pick([[2,3],[3,4],[2,5],[3,5],[4,5],[5,6],[2,7],[3,7],[4,7],[5,7],[6,7],[3,8],[5,8],[7,8],[2,9],[4,9],[5,9],[7,9],[8,9],[3,10],[7,10]]);
  const [n0, d0] = small;
  const a = n0 * gcdVal;
  const b = d0 * gcdVal;
  return {
    question: `Simplifie ${a}/${b}`,
    answerFrac: [n0, d0],
    answer: n0 / d0,
    isFraction: true,
    trick: "Diviseur commun express",
    explanation: `<b>Astuce :</b> repère le <b>plus grand diviseur commun</b> entre ${a} et ${b}.<br>
      <span class="step">${a} = ${gcdVal} × ${n0}</span>
      <span class="step">${b} = ${gcdVal} × ${d0}</span>
      <span class="step">Donc ${a}/${b} = <b>${n0}/${d0}</b></span>`
  };
}

/* Stage 2 : Simplification en croix avant multiplication
   (a×b) / (c×d) où a/c et b/d simplifient */
function gen_frac_cross() {
  // Choisis 2 paires qui se simplifient
  const pairs = [[[6, 9], [4, 8]], [[10, 15], [6, 14]], [[12, 18], [10, 25]],
                 [[8, 12], [9, 15]], [[14, 21], [10, 25]], [[15, 25], [8, 12]],
                 [[6, 10], [8, 12]], [[9, 12], [10, 15]]];
  const [[a, c], [b, d]] = pick(pairs);
  const ga = gcd(a, c);
  const gb = gcd(b, d);
  const aS = a / ga, cS = c / ga;
  const bS = b / gb, dS = d / gb;
  const finalN = aS * bS;
  const finalD = cS * dS;
  const fg = gcd(finalN, finalD);
  return {
    question: `(${a} × ${b}) / (${c} × ${d})`,
    answerFrac: [finalN / fg, finalD / fg],
    answer: finalN / finalD,
    isFraction: true,
    trick: "Simplification en croix",
    explanation: `<b>Astuce :</b> simplifie AVANT de multiplier !<br>
      <span class="step">${a}/${c} → ÷${ga} → ${aS}/${cS}</span>
      <span class="step">${b}/${d} → ÷${gb} → ${bS}/${dS}</span>
      <span class="step">Reste : (${aS} × ${bS}) / (${cS} × ${dS}) = <b>${fmtFrac(finalN/fg, finalD/fg)}</b></span>`
  };
}

/* Stage 3 : Fraction d'un nombre — toujours diviser d'abord
   k/d × n  où n est multiple de d */
function gen_frac_of_number() {
  const d = pick([2, 3, 4, 5, 6, 8, 10]);
  const k = rng(1, d - 1);
  const m = rng(2, 12);
  const n = d * m; // multiple de d
  const r = k * m;
  return {
    question: `${k}/${d} × ${n}`,
    answer: r,
    trick: "Diviser d'abord !",
    explanation: `<b>Astuce :</b> ne fais pas ${k} × ${n} = ${k*n} puis ÷${d}. C'est plus dur !<br>
      <span class="step">D'abord ${n} ÷ ${d} = <b>${m}</b></span>
      <span class="step">Puis × ${k} = <b>${r}</b></span>`
  };
}

/* Stage 4 : Pourcentages = fractions */
function gen_frac_pct() {
  const cases = [
    { pct: 50, frac: '1/2', op: 'la moitié' },
    { pct: 25, frac: '1/4', op: 'le quart' },
    { pct: 75, frac: '3/4', op: 'les trois quarts' },
    { pct: 10, frac: '1/10', op: 'le dixième' },
    { pct: 20, frac: '1/5', op: 'le cinquième' },
    { pct: 12.5, frac: '1/8', op: 'le huitième' },
  ];
  const c = pick(cases);
  // Choisis un nombre divisible
  let n;
  if (c.pct === 50) n = pick([24, 48, 60, 80, 100, 120, 150, 200, 250, 360]);
  else if (c.pct === 25) n = pick([20, 40, 60, 80, 100, 120, 200, 240, 400, 600]);
  else if (c.pct === 75) n = pick([20, 40, 60, 80, 100, 120, 200, 240, 400]);
  else if (c.pct === 10) n = pick([20, 30, 50, 70, 80, 120, 150, 200, 350, 600]);
  else if (c.pct === 20) n = pick([15, 25, 35, 50, 75, 100, 150, 200, 300]);
  else n = pick([16, 24, 40, 56, 80, 120, 160, 200, 240, 320]);
  const r = n * c.pct / 100;
  return {
    question: `${c.pct}% de ${n}`,
    answer: r,
    trick: "Pourcentage = fraction",
    explanation: `<b>Astuce :</b> ${c.pct}% = <b>${c.frac}</b> = ${c.op} !<br>
      <span class="step">${n} × ${c.frac}</span>
      <span class="step">= <b>${r}</b></span>`
  };
}

/* Stage 5 : Diviser par une fraction = multiplier par l'inverse */
function gen_frac_divide_by() {
  const d = pick([2, 3, 4, 5, 8]);
  const k = pick([1, 2, 3, 4].filter(x => x < d));
  const m = pick([12, 15, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72]);
  const r = m * d / k;
  // S'assure que c'est entier
  if (!Number.isInteger(r)) return gen_frac_divide_by();
  return {
    question: `${m} ÷ ${k}/${d}`,
    answer: r,
    trick: "Diviser par une fraction = ×inverse",
    explanation: `<b>Magie :</b> diviser par ${k}/${d}, c'est multiplier par <b>${d}/${k}</b> !<br>
      <span class="step">${m} ÷ ${k}/${d} = ${m} × ${d}/${k}</span>
      <span class="step">= ${m * d}/${k}</span>
      <span class="step">= <b>${r}</b></span>`
  };
}

/* Stage 6 : Associer pour faire 1 — produits de fractions où tout se simplifie */
function gen_frac_associate() {
  // (a × b × c) / (d × e × f) où chaque paire se simplifie
  const trios = [
    { num: [7, 5, 12], den: [15, 14], r: [2, 1] },        // (7×5×12)/(15×14) = 2
    { num: [9, 4, 10], den: [3, 5, 8], r: [3, 1] },       // (9×4×10)/(3×5×8) = 3
    { num: [6, 8, 15], den: [4, 9, 10], r: [2, 1] },      // (6×8×15)/(4×9×10) = 2
    { num: [12, 7, 25], den: [14, 5, 6], r: [5, 1] },     // (12×7×25)/(14×5×6) = 5
    { num: [8, 9, 5], den: [3, 4, 15], r: [2, 1] },       // (8×9×5)/(3×4×15) = 2
    { num: [10, 21, 4], den: [7, 6, 5], r: [4, 1] },      // (10×21×4)/(7×6×5) = 4
    { num: [16, 15, 7], den: [5, 8, 21], r: [2, 1] },     // (16×15×7)/(5×8×21) = 2
  ];
  const t = pick(trios);
  const numStr = t.num.join(' × ');
  const denStr = t.den.join(' × ');
  return {
    question: `(${numStr}) / (${denStr})`,
    answer: t.r[0] / t.r[1],
    answerFrac: t.r,
    isFraction: t.r[1] !== 1,
    trick: "Associer pour simplifier",
    explanation: `<b>Astuce :</b> avant de calculer, regarde ce qui se simplifie !<br>
      <span class="step">Cherche les paires haut/bas qui ont des diviseurs communs</span>
      <span class="step">Tout se simplifie pour donner <b>${fmtFrac(t.r[0], t.r[1])}</b></span>`
  };
}

/* Stage 7 : Repérer les "amis" qui font 100, 1000... */
function gen_frac_hidden_factor() {
  const cases = [
    { n: 125, d: 1000, hint: '125 × 8 = 1000', r: [1, 8] },
    { n: 250, d: 1000, hint: '250 × 4 = 1000', r: [1, 4] },
    { n: 500, d: 1000, hint: '500 × 2 = 1000', r: [1, 2] },
    { n: 25, d: 100, hint: '25 × 4 = 100', r: [1, 4] },
    { n: 75, d: 100, hint: '75 = 3 × 25', r: [3, 4] },
    { n: 625, d: 1000, hint: '625 = 5 × 125 ; 1000 = 8 × 125', r: [5, 8] },
    { n: 875, d: 1000, hint: '875 = 7 × 125', r: [7, 8] },
    { n: 375, d: 1000, hint: '375 = 3 × 125', r: [3, 8] },
    { n: 200, d: 1000, hint: '200 × 5 = 1000', r: [1, 5] },
    { n: 40, d: 1000, hint: '40 × 25 = 1000', r: [1, 25] },
  ];
  const c = pick(cases);
  return {
    question: `Simplifie ${c.n}/${c.d}`,
    answerFrac: c.r,
    answer: c.r[0] / c.r[1],
    isFraction: c.r[1] !== 1,
    trick: "Repérer le facteur caché",
    explanation: `<b>Astuce :</b> ${c.hint}<br>
      <span class="step">${c.n}/${c.d} = <b>${fmtFrac(c.r[0], c.r[1])}</b></span>`
  };
}

/* Stage 8 : Marathon — fractions astucieuses chaînées */
function gen_frac_marathon() {
  return pick([gen_frac_simplify, gen_frac_cross, gen_frac_of_number,
               gen_frac_pct, gen_frac_divide_by, gen_frac_associate, gen_frac_hidden_factor])();
}

window.gcd = gcd;
window.fmtFrac = fmtFrac;
window.fracEquals = fracEquals;
window.gen_pb_mix = gen_pb_mix;
window.gen_pb_simple_add = gen_pb_simple_add;
window.gen_pb_simple_sub = gen_pb_simple_sub;
window.gen_pb_mult = gen_pb_mult;
window.gen_pb_div = gen_pb_div;
window.gen_pb_pct = gen_pb_pct;
window.gen_pb_chain = gen_pb_chain;

/* ===== Phrases d'encouragement (bonne réponse) ===== */
const HYPE_PHRASES = [
  "Tu déchires !", "Imparable !", "Cerveau en fusion !", "Trop fort !",
  "Tu vas trop vite !", "Champion !", "Magnifique !", "T'es chaud !",
  "On t'arrête plus !", "Brillant !", "Génie !", "C'est du calcul mental ça ?!",
  "Tu rigoles ?", "Pro level !", "Boom !", "C'est pas humain !",
  "Tu défies les maths !", "Énorme !", "Tu carbonises !", "Force tranquille !",
];

const STREAK_PHRASES = {
  3:  ["Combo x3 !", "Tu chauffes !"],
  5:  ["🔥 ÇA PREND FEU !", "Combo x5 !", "T'es lancé !"],
  10: ["⚡ COMBO X10 !", "INARRÊTABLE !", "EN FEU !"],
  15: ["🌪️ TORNADE !", "Combo x15 !", "DESTRUCTION TOTALE !"],
  20: ["💥 COMBO X20 !!", "TU EXPLOSES TOUT !", "MODE LÉGENDE !"],
  30: ["🌟 UNSTOPPABLE !", "X30 !!! INCROYABLE !", "EST-CE HUMAIN ?"],
};

const COMFORT_PHRASES = [
  "On apprend ! Lis bien la méthode 👇",
  "Pas grave, regarde l'astuce !",
  "C'est en se trompant qu'on devient fort 💪",
  "Tu retiens, c'est ça qui compte !",
  "Un pro fait aussi des erreurs.",
  "L'important c'est de comprendre !",
];

window.RANKS = RANKS;
window.rankFor = rankFor;
window.nextRank = nextRank;
window.HYPE_PHRASES = HYPE_PHRASES;
window.STREAK_PHRASES = STREAK_PHRASES;
window.COMFORT_PHRASES = COMFORT_PHRASES;

/* Export pour app.js (no-module — vars globales) */
window.WORLDS = WORLDS;
window.TROPHIES = TROPHIES;
window.AVATARS = AVATARS;
window.GEN_DAILY = gen_daily;
window.GEN_SURVIVAL = gen_survival;
window.fmt = fmt;
window.answerEquals = answerEquals;
