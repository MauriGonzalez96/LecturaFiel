import type { LexiconEntry } from '../types/lexicon'

/**
 * Léxico semilla: solo términos de niveles 2–3 (y algunos 1 de referencia
 * para demostrar que el motor NO los toca).
 *
 * Prioridad: rareza / dificultad, no formalidad ni longitud.
 */
export const SEED_LEXICON: LexiconEntry[] = [
  // ── Nivel 1: literario / formal vigente → NO sustituir ──────────────────
  {
    lemma: 'melancolia',
    forms: ['melancolía', 'melancolia', 'melancólico', 'melancolica', 'melancólica'],
    level: 1,
    definition: 'Tristeza vaga, profunda y sosegada.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
    notes: 'Literario habitual; conservar.',
  },
  {
    lemma: 'cristalino',
    forms: ['cristalino', 'cristalina', 'cristalinos', 'cristalinas'],
    level: 1,
    definition: 'Claro y transparente como el cristal.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
  },
  {
    lemma: 'desolacion',
    forms: ['desolación', 'desolacion', 'desolado', 'desolada'],
    level: 1,
    definition: 'Aflicción grande; estado de algo abandonado o destruido.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
  },
  {
    lemma: 'deplorable',
    forms: ['deplorable', 'deplorables'],
    level: 1,
    definition: 'Digno de ser deplorado; lamentable.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
    notes: 'Formal vigente; no simplificar por existir sinónimo más sencillo.',
  },
  {
    lemma: 'pristino',
    forms: ['prístino', 'pristino', 'prístina', 'pristina'],
    level: 1,
    definition: 'Antiguo, primero, original; puro, sin mancha.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
    notes: 'Generalmente conservar; matices importantes.',
  },
  {
    lemma: 'paraje',
    forms: ['paraje', 'parajes'],
    level: 1,
    definition: 'Sitio o lugar, especialmente al aire libre.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
  },

  // ── Nivel 2: poco frecuente → evaluar ───────────────────────────────────
  {
    lemma: 'sofisma',
    forms: ['sofisma', 'sofismas'],
    level: 2,
    definition:
      'Razonamiento que parece correcto, pero contiene un error o se utiliza para engañar o convencer mediante una argumentación defectuosa.',
    preferredSubstitute: 'razonamiento engañoso',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'apodictico',
    forms: ['apodíctico', 'apodictico', 'apodíctica', 'apodictica'],
    level: 2,
    definition: 'Que implica o expresa una verdad necesaria o incontestable.',
    preferredSubstitute: null,
    defaultDecision: 'glossary_only',
    notes: 'Puede requerir explicación más precisa que un sinónimo corto.',
  },
  {
    lemma: 'inmarcesible',
    forms: ['inmarcesible', 'inmarcesibles'],
    level: 2,
    definition: 'Que no se marchita; imperecedero.',
    preferredSubstitute: 'imperecedero',
    defaultDecision: 'evaluate',
    notes: 'El mejor sustituto depende de qué se esté describiendo.',
  },
  {
    lemma: 'protervo',
    forms: ['protervo', 'proterva', 'protervos', 'protervas'],
    level: 2,
    definition: 'Obstinado en la maldad; perverso.',
    preferredSubstitute: 'perverso',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'solaz',
    forms: ['solaz', 'solaces'],
    level: 2,
    definition: 'Esparcimiento, diversión o alivio del trabajo.',
    preferredSubstitute: 'descanso',
    defaultDecision: 'evaluate',
  },

  // ── Nivel 3: arcaico / muy culto / difícil → considerar sustitución ─────
  {
    lemma: 'empero',
    forms: ['empero'],
    level: 3,
    definition: 'Sin embargo; no obstante.',
    preferredSubstitute: 'sin embargo',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'hogano',
    forms: ['hogaño', 'hogano'],
    level: 3,
    definition: 'En este año; en la actualidad (arcaico/desusado frente a antaño).',
    preferredSubstitute: 'en la actualidad',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'maguer',
    forms: ['maguer', 'magüer'],
    level: 3,
    definition: 'Aunque (arcaísmo).',
    preferredSubstitute: 'aunque',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'asaz',
    forms: ['asaz'],
    level: 3,
    definition: 'Bastante, harto (arcaico/literario restringido).',
    preferredSubstitute: 'bastante',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'doquiera',
    forms: ['doquiera', 'doquier'],
    level: 3,
    definition: 'En cualquier parte.',
    preferredSubstitute: 'dondequiera',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'ojaldre',
    forms: ['ojaldre'],
    level: 3,
    definition: 'Masa hojaldrada (forma poco habitual / regional).',
    preferredSubstitute: 'hojaldre',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'albricias',
    forms: ['albricias'],
    level: 3,
    definition: 'Regalo o anuncio de una buena noticia; ¡enhorabuena!',
    preferredSubstitute: '¡enhorabuena!',
    defaultDecision: 'evaluate',
  },
  {
    lemma: 'fablar',
    forms: ['fablar', 'fabló', 'fablo', 'fablaba'],
    level: 3,
    definition: 'Hablar (arcaísmo medieval).',
    preferredSubstitute: 'hablar',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'yusgo',
    forms: ['yusgo'],
    level: 3,
    definition: 'Forma arcaica / dialectal poco reconocible; en contexto suele equivaler a «juzgo».',
    preferredSubstitute: 'juzgo',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'quid',
    forms: ['quid'],
    level: 2,
    definition: 'Esencia, punto clave o razón de algo.',
    preferredSubstitute: 'punto clave',
    defaultDecision: 'evaluate',
  },

  // ── Nivel 2 ampliado ────────────────────────────────────────────────────
  {
    lemma: 'efimero',
    forms: ['efímero', 'efimero', 'efímera', 'efimera', 'efímeros', 'efímeras'],
    level: 1,
    definition: 'Pasajero, de corta duración.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
    notes: 'Literario/formal reconocible; conservar.',
  },
  {
    lemma: 'languidez',
    forms: ['languidez', 'lánguido', 'languido', 'lánguida', 'languida'],
    level: 1,
    definition: 'Falta de vigor; flojedad.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
  },
  {
    lemma: 'peripecia',
    forms: ['peripecia', 'peripecias'],
    level: 1,
    definition: 'Lance imprevisto; vicisitud.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
  },
  {
    lemma: 'sibarita',
    forms: ['sibarita', 'sibaritas'],
    level: 2,
    definition: 'Persona aficionada al lujo y a los placeres refinados.',
    preferredSubstitute: 'amante del lujo',
    defaultDecision: 'evaluate',
  },
  {
    lemma: 'prosopopeya',
    forms: ['prosopopeya', 'prosopopeyas'],
    level: 2,
    definition: 'Figura retórica que atribuye cualidades humanas a lo inanimado.',
    preferredSubstitute: null,
    defaultDecision: 'glossary_only',
  },
  {
    lemma: 'catacresis',
    forms: ['catacresis', 'catacreses'],
    level: 2,
    definition: 'Uso de una palabra en sentido figurado por falta de término propio.',
    preferredSubstitute: null,
    defaultDecision: 'glossary_only',
  },
  {
    lemma: 'anodino',
    forms: ['anodino', 'anodina', 'anodinos', 'anodinas'],
    level: 2,
    definition: 'Insignificante, que no llama la atención ni causa efecto.',
    preferredSubstitute: 'insignificante',
    defaultDecision: 'evaluate',
  },
  {
    lemma: 'ignavia',
    forms: ['ignavia'],
    level: 2,
    definition: 'Pereza, desidia.',
    preferredSubstitute: 'pereza',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'obnubilar',
    forms: ['obnubilar', 'obnubiló', 'obnubilo', 'obnubilaba', 'obnubilado', 'obnubilada'],
    level: 2,
    definition: 'Ofuscar, nublar el entendimiento.',
    preferredSubstitute: 'ofuscar',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'peregrino',
    forms: ['peregrino', 'peregrina', 'peregrinos', 'peregrinas'],
    level: 2,
    definition: 'Extraño, raro; también: viajero a un santuario.',
    preferredSubstitute: null,
    defaultDecision: 'glossary_only',
    notes: 'Polisémica: sin contexto fiable, solo glosario.',
  },
  {
    lemma: 'vituperio',
    forms: ['vituperio', 'vituperios', 'vituperar', 'vituperó'],
    level: 2,
    definition: 'Censura, insulto o reprobación dura.',
    preferredSubstitute: 'insulto',
    defaultDecision: 'evaluate',
  },
  {
    lemma: 'execrar',
    forms: ['execrar', 'execró', 'execro', 'execrado', 'execrada'],
    level: 2,
    definition: 'Condenar con dureza; aborrecer.',
    preferredSubstitute: 'condenar',
    defaultDecision: 'substitute',
  },

  // ── Nivel 3 ampliado ────────────────────────────────────────────────────
  {
    lemma: 'ansinas',
    forms: ['ansinas', 'ansina'],
    level: 3,
    definition: 'Así (forma arcaica / popular arcaizante).',
    preferredSubstitute: 'así',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'ende',
    forms: ['ende'],
    level: 3,
    definition: 'Por eso; de ahí (arcaísmo). Si forma «por ende», suele ser reconocible.',
    preferredSubstitute: 'por eso',
    defaultDecision: 'evaluate',
    notes: 'No sustituir tras «por» (dejar «por ende»).',
  },
  {
    lemma: 'agora',
    forms: ['agora'],
    level: 3,
    definition: 'Ahora (arcaísmo; no confundir con el ágora griega).',
    preferredSubstitute: 'ahora',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'mesmo',
    forms: ['mesmo', 'mesma', 'mesmos', 'mesmas'],
    level: 3,
    definition: 'Mismo (arcaísmo / dialectal).',
    preferredSubstitute: 'mismo',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'dende',
    forms: ['dende'],
    level: 3,
    definition: 'Desde (arcaísmo).',
    preferredSubstitute: 'desde',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'aguisar',
    forms: ['aguisar', 'aguisado', 'aguisada'],
    level: 3,
    definition: 'Preparar, disponer (arcaísmo).',
    preferredSubstitute: 'preparar',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'catar',
    forms: ['catar', 'cató', 'cato', 'cataba'],
    level: 3,
    definition: 'Mirar, considerar (sentido arcaico; hoy suele ser «degustar»).',
    preferredSubstitute: null,
    defaultDecision: 'glossary_only',
    notes: 'Polisémica moderna vs arcaica; solo glosario.',
  },
  {
    lemma: 'yacer',
    forms: ['yacer', 'yace', 'yacía', 'yacia'],
    level: 1,
    definition: 'Estar echado o sepultado.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
    notes: 'Literario pero reconocible en epitafios y narrativa.',
  },
  {
    lemma: 'faltriquera',
    forms: ['faltriquera', 'faltriqueras'],
    level: 2,
    definition: 'Bolsillo o bolsa pequeña para llevar dinero u objetos.',
    preferredSubstitute: 'bolsillo',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'alnafe',
    forms: ['alnafe', 'anafe'],
    level: 3,
    definition: 'Hornillo portátil.',
    preferredSubstitute: 'hornillo',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'hecatombe',
    forms: ['hecatombe', 'hecatombes'],
    level: 1,
    definition: 'Matanza o desastre de gran magnitud.',
    preferredSubstitute: null,
    defaultDecision: 'preserve',
  },
  {
    lemma: 'epinicio',
    forms: ['epinicio', 'epinicios'],
    level: 3,
    definition: 'Canto de victoria.',
    preferredSubstitute: 'canto de victoria',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'threnos',
    forms: ['treno', 'trenos', 'threnos'],
    level: 3,
    definition: 'Canto fúnebre; lamentación.',
    preferredSubstitute: 'canto fúnebre',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'sicofanta',
    forms: ['sicofanta', 'sicofantas', 'sicofante'],
    level: 3,
    definition: 'Delator o calumniador interesado.',
    preferredSubstitute: 'calumniador',
    defaultDecision: 'substitute',
  },
  {
    lemma: 'zacatin',
    forms: ['zacatín', 'zacatin'],
    level: 3,
    definition: 'Calle o barrio de mercaderes (histórico / local).',
    preferredSubstitute: null,
    defaultDecision: 'glossary_only',
  },
]

/** Índice rápido forma normalizada → entrada. */
export function buildFormIndex(
  entries: LexiconEntry[] = SEED_LEXICON,
): Map<string, LexiconEntry> {
  const index = new Map<string, LexiconEntry>()
  for (const entry of entries) {
    for (const form of entry.forms) {
      index.set(normalizeForm(form), entry)
    }
    index.set(normalizeForm(entry.lemma), entry)
  }
  return index
}

export function normalizeForm(word: string): string {
  return word
    .normalize('NFC')
    .toLowerCase()
    .replace(/^[«»„"'"‘’]+|[«»„"'"‘’.,;:!?…]+$/g, '')
}
