import { stripDiacritics } from './commonSpanish'

export interface EasySynonym {
  /** Modos 2–3 */
  preferred: string
  /** Modo 4 — lo más fácil */
  simple: string
  definition?: string
}

/**
 * Sinónimos fáciles para palabras formales / abstractas.
 * Clave sin diacríticos. Si hay match, la rareza SÍ se sustituye.
 */
const RAW: Record<string, EasySynonym> = {
  planificacion: { preferred: 'plan', simple: 'plan' },
  mentalidad: { preferred: 'forma de pensar', simple: 'manera de pensar' },
  contraria: { preferred: 'opuesta', simple: 'en contra' },
  contrario: { preferred: 'opuesto', simple: 'en contra' },
  competencia: { preferred: 'rivalidad', simple: 'rivalidad' },
  debilitado: { preferred: 'más débil', simple: 'más débil' },
  debilitada: { preferred: 'más débil', simple: 'más débil' },
  eficazmente: { preferred: 'con eficacia', simple: 'bien' },
  eficaz: { preferred: 'eficaz', simple: 'que funciona bien' },
  intento: { preferred: 'intento', simple: 'prueba' },
  desmontar: { preferred: 'desarmar', simple: 'sacar' },
  hostilidad: { preferred: 'enemistad', simple: 'odio' },
  hostil: { preferred: 'enemigo', simple: 'enemigo' },
  reemplazar: { preferred: 'cambiar', simple: 'cambiar' },
  terminos: { preferred: 'palabras', simple: 'palabras' },
  capitalismo: { preferred: 'economía de mercado', simple: 'economía de mercado' },
  socialismo: { preferred: 'economía estatal', simple: 'economía estatal' },
  socialistas: { preferred: 'del socialismo', simple: 'del socialismo' },
  socialista: { preferred: 'del socialismo', simple: 'del socialismo' },
  generalmente: { preferred: 'por lo general', simple: 'casi siempre' },
  encubrir: { preferred: 'ocultar', simple: 'esconder' },
  encubren: { preferred: 'ocultan', simple: 'esconden' },
  encubre: { preferred: 'oculta', simple: 'esconde' },
  ilustrar: { preferred: 'mostrar', simple: 'mostrar' },
  ilustran: { preferred: 'muestran', simple: 'muestran' },
  ilustra: { preferred: 'muestra', simple: 'muestra' },
  dirigida: { preferred: 'controlada', simple: 'controlada' },
  dirigido: { preferred: 'controlado', simple: 'controlado' },
  dirigidas: { preferred: 'controladas', simple: 'controladas' },
  dirigidos: { preferred: 'controlados', simple: 'controlados' },

  asimismo: { preferred: 'también', simple: 'también' },
  indudablemente: { preferred: 'sin duda', simple: 'seguro' },
  indudable: { preferred: 'seguro', simple: 'seguro' },
  fundamentalmente: { preferred: 'en lo esencial', simple: 'sobre todo' },
  esencialmente: { preferred: 'en esencia', simple: 'en lo básico' },
  principalmente: { preferred: 'sobre todo', simple: 'sobre todo' },
  posteriormente: { preferred: 'después', simple: 'después' },
  previamente: { preferred: 'antes', simple: 'antes' },
  actualmente: { preferred: 'hoy', simple: 'hoy' },
  aproximadamente: { preferred: 'más o menos', simple: 'más o menos' },
  significativamente: { preferred: 'mucho', simple: 'mucho' },
  considerablemente: { preferred: 'bastante', simple: 'bastante' },
  necesariamente: { preferred: 'por fuerza', simple: 'sí o sí' },
  exclusivamente: { preferred: 'solo', simple: 'solo' },
  respectivamente: { preferred: 'en ese orden', simple: 'cada uno' },
  particularmente: { preferred: 'sobre todo', simple: 'sobre todo' },
  relativamente: { preferred: 'más o menos', simple: 'un poco' },
  absolutamente: { preferred: 'por completo', simple: 'del todo' },
  completamente: { preferred: 'del todo', simple: 'del todo' },
  totalmente: { preferred: 'del todo', simple: 'del todo' },
  parcialmente: { preferred: 'en parte', simple: 'en parte' },
  inicialmente: { preferred: 'al principio', simple: 'al inicio' },
  finalmente: { preferred: 'al final', simple: 'al final' },
  eventualmente: { preferred: 'quizá', simple: 'quizá' },
  frecuentemente: { preferred: 'a menudo', simple: 'mucho' },
  habitualmente: { preferred: 'de costumbre', simple: 'casi siempre' },
  constantemente: { preferred: 'sin parar', simple: 'todo el tiempo' },
  progresivamente: { preferred: 'de a poco', simple: 'de a poco' },
  predominantemente: { preferred: 'sobre todo', simple: 'sobre todo' },
  aparentemente: { preferred: 'al parecer', simple: 'parece que' },
  implicitamente: { preferred: 'sin decirlo', simple: 'sin decirlo' },
  explicitamente: { preferred: 'en claro', simple: 'en claro' },

  consecuencia: { preferred: 'resultado', simple: 'resultado' },
  consecuencias: { preferred: 'resultados', simple: 'resultados' },
  mediante: { preferred: 'con', simple: 'con' },
  establecer: { preferred: 'fijar', simple: 'poner' },
  establecido: { preferred: 'fijado', simple: 'puesto' },
  establecida: { preferred: 'fijada', simple: 'puesta' },
  constituir: { preferred: 'formar', simple: 'ser' },
  constituye: { preferred: 'forma', simple: 'es' },
  constituyen: { preferred: 'forman', simple: 'son' },
  determinar: { preferred: 'decidir', simple: 'decidir' },
  determinado: { preferred: 'cierto', simple: 'ese' },
  determinada: { preferred: 'cierta', simple: 'esa' },
  efectuar: { preferred: 'hacer', simple: 'hacer' },
  realizar: { preferred: 'hacer', simple: 'hacer' },
  realizado: { preferred: 'hecho', simple: 'hecho' },
  realizada: { preferred: 'hecha', simple: 'hecha' },
  obtener: { preferred: 'conseguir', simple: 'conseguir' },
  obtenido: { preferred: 'conseguido', simple: 'conseguido' },
  correspondiente: { preferred: 'que corresponde', simple: 'de eso' },
  correspondientes: { preferred: 'que corresponden', simple: 'de eso' },
  pertinente: { preferred: 'adecuado', simple: 'que viene al caso' },
  relevante: { preferred: 'importante', simple: 'importante' },
  relevantes: { preferred: 'importantes', simple: 'importantes' },
  significativo: { preferred: 'importante', simple: 'importante' },
  significativa: { preferred: 'importante', simple: 'importante' },
  sustancial: { preferred: 'importante', simple: 'grande' },
  sustancialmente: { preferred: 'en gran medida', simple: 'mucho' },
  evidente: { preferred: 'claro', simple: 'claro' },
  evidentes: { preferred: 'claros', simple: 'claros' },
  evidencia: { preferred: 'prueba', simple: 'prueba' },
  aparente: { preferred: 'que parece', simple: 'que parece' },
  presupone: { preferred: 'da por hecho', simple: 'cree de antemano' },
  presuponer: { preferred: 'dar por hecho', simple: 'creer de antemano' },

  intervencion: { preferred: 'intervención', simple: 'meterse' },
  intervenir: { preferred: 'intervenir', simple: 'meterse' },
  regulacion: { preferred: 'regulación', simple: 'reglas' },
  restringir: { preferred: 'limitar', simple: 'limitar' },
  restriccion: { preferred: 'límite', simple: 'límite' },
  restricciones: { preferred: 'límites', simple: 'límites' },
  impedir: { preferred: 'evitar', simple: 'no dejar' },
  impide: { preferred: 'evita', simple: 'no deja' },
  impiden: { preferred: 'evitan', simple: 'no dejan' },
  permitir: { preferred: 'dejar', simple: 'dejar' },
  permite: { preferred: 'deja', simple: 'deja' },
  permiten: { preferred: 'dejan', simple: 'dejan' },
  favorecer: { preferred: 'ayudar', simple: 'ayudar' },
  favorece: { preferred: 'ayuda', simple: 'ayuda' },
  perjudicar: { preferred: 'dañar', simple: 'hacer daño' },
  perjudica: { preferred: 'daña', simple: 'hace daño' },

  produccion: { preferred: 'producción', simple: 'hacer cosas' },
  producir: { preferred: 'producir', simple: 'hacer' },
  producen: { preferred: 'producen', simple: 'hacen' },
  consumo: { preferred: 'consumo', simple: 'uso' },
  distribucion: { preferred: 'reparto', simple: 'reparto' },
  distribuir: { preferred: 'repartir', simple: 'repartir' },
  propietario: { preferred: 'dueño', simple: 'dueño' },
  propietarios: { preferred: 'dueños', simple: 'dueños' },
  adquisicion: { preferred: 'compra', simple: 'compra' },
  adquirir: { preferred: 'conseguir', simple: 'conseguir' },

  concepcion: { preferred: 'idea', simple: 'idea' },
  concepto: { preferred: 'idea', simple: 'idea' },
  conceptos: { preferred: 'ideas', simple: 'ideas' },
  nocion: { preferred: 'idea', simple: 'idea' },
  nociones: { preferred: 'ideas', simple: 'ideas' },
  perspectiva: { preferred: 'punto de vista', simple: 'mirada' },
  perspectivas: { preferred: 'puntos de vista', simple: 'miradas' },
  enfoque: { preferred: 'punto de vista', simple: 'mirada' },
  planteamiento: { preferred: 'propuesta', simple: 'idea' },
  planteamientos: { preferred: 'propuestas', simple: 'ideas' },
  plantear: { preferred: 'proponer', simple: 'decir' },
  plantea: { preferred: 'propone', simple: 'dice' },
  argumentacion: { preferred: 'argumento', simple: 'razones' },
  argumento: { preferred: 'razón', simple: 'razón' },
  argumentos: { preferred: 'razones', simple: 'razones' },
  afirmacion: { preferred: 'afirmación', simple: 'lo que se dice' },
  afirmar: { preferred: 'decir', simple: 'decir' },
  afirma: { preferred: 'dice', simple: 'dice' },
  afirman: { preferred: 'dicen', simple: 'dicen' },
  contradiccion: { preferred: 'contradicción', simple: 'choque' },
  oposicion: { preferred: 'oposición', simple: 'estar en contra' },

  existencia: { preferred: 'existencia', simple: 'que haya' },
  existente: { preferred: 'que hay', simple: 'que hay' },
  existentes: { preferred: 'que hay', simple: 'que hay' },
  ausencia: { preferred: 'falta', simple: 'falta' },
  carecer: { preferred: 'no tener', simple: 'no tener' },
  carece: { preferred: 'no tiene', simple: 'no tiene' },
  carecen: { preferred: 'no tienen', simple: 'no tienen' },

  necesario: { preferred: 'necesario', simple: 'hace falta' },
  necesaria: { preferred: 'necesaria', simple: 'hace falta' },
  necesidad: { preferred: 'necesidad', simple: 'lo que hace falta' },
  suficiente: { preferred: 'bastante', simple: 'bastante' },
  insuficiente: { preferred: 'poco', simple: 'poco' },
  adecuado: { preferred: 'adecuado', simple: 'que sirve' },
  adecuada: { preferred: 'adecuada', simple: 'que sirve' },

  autoridad: { preferred: 'autoridad', simple: 'quien manda' },
  autoridades: { preferred: 'autoridades', simple: 'quien manda' },
  estatal: { preferred: 'del Estado', simple: 'del gobierno' },
  estatales: { preferred: 'del Estado', simple: 'del gobierno' },
  gubernamental: { preferred: 'del gobierno', simple: 'del gobierno' },
  administracion: { preferred: 'administración', simple: 'gestión' },
  burocracia: { preferred: 'burocracia', simple: 'trámites' },

  individuo: { preferred: 'persona', simple: 'persona' },
  individuos: { preferred: 'personas', simple: 'personas' },
  individual: { preferred: 'de cada uno', simple: 'de cada uno' },
  colectivo: { preferred: 'de todos', simple: 'de todos' },
  colectiva: { preferred: 'de todos', simple: 'de todos' },
  sociedad: { preferred: 'sociedad', simple: 'la gente' },
  comunidad: { preferred: 'comunidad', simple: 'grupo' },

  tendencia: { preferred: 'tendencia', simple: 'camino' },
  fenomeno: { preferred: 'hecho', simple: 'hecho' },
  fenomenos: { preferred: 'hechos', simple: 'hechos' },
  proceso: { preferred: 'proceso', simple: 'paso a paso' },
  procesos: { preferred: 'procesos', simple: 'pasos' },
  mecanismo: { preferred: 'mecanismo', simple: 'cómo funciona' },
  mecanismos: { preferred: 'mecanismos', simple: 'cómo funcionan' },
  funcion: { preferred: 'función', simple: 'papel' },
  funciones: { preferred: 'funciones', simple: 'papeles' },

  ventaja: { preferred: 'ventaja', simple: 'lo bueno' },
  desventaja: { preferred: 'desventaja', simple: 'lo malo' },
  beneficio: { preferred: 'beneficio', simple: 'ganancia' },
  beneficios: { preferred: 'beneficios', simple: 'ganancias' },
  perjuicio: { preferred: 'daño', simple: 'daño' },

  capacidad: { preferred: 'capacidad', simple: 'poder hacer' },
  posibilidad: { preferred: 'posibilidad', simple: 'chance' },
  posibilidades: { preferred: 'posibilidades', simple: 'chances' },
  imposible: { preferred: 'imposible', simple: 'no se puede' },
  viable: { preferred: 'posible', simple: 'que se puede' },

  discusion: { preferred: 'discusión', simple: 'charla' },
  controversia: { preferred: 'disputa', simple: 'pelea de ideas' },
  polemica: { preferred: 'disputa', simple: 'pelea de ideas' },
  critica: { preferred: 'crítica', simple: 'señal de lo malo' },

  interpretacion: { preferred: 'lectura', simple: 'cómo se entiende' },
  interpretar: { preferred: 'entender', simple: 'entender' },
  comprension: { preferred: 'entendimiento', simple: 'entender' },
  desconocer: { preferred: 'no conocer', simple: 'no saber' },
  desconoce: { preferred: 'no conoce', simple: 'no sabe' },

  destacar: { preferred: 'señalar', simple: 'marcar' },
  destaca: { preferred: 'señala', simple: 'marca' },
  destacan: { preferred: 'señalan', simple: 'marcan' },
  subrayar: { preferred: 'señalar', simple: 'marcar' },
  enfatizar: { preferred: 'remarcar', simple: 'marcar' },

  eliminar: { preferred: 'quitar', simple: 'sacar' },
  elimina: { preferred: 'quita', simple: 'saca' },
  eliminan: { preferred: 'quitan', simple: 'sacan' },
  suprimir: { preferred: 'quitar', simple: 'sacar' },
  sustituir: { preferred: 'cambiar', simple: 'cambiar' },
  sustituye: { preferred: 'cambia', simple: 'cambia' },
  sustituyen: { preferred: 'cambian', simple: 'cambian' },
  modificar: { preferred: 'cambiar', simple: 'cambiar' },
  altera: { preferred: 'cambia', simple: 'cambia' },
  alteracion: { preferred: 'cambio', simple: 'cambio' },

  incrementar: { preferred: 'aumentar', simple: 'subir' },
  incrementa: { preferred: 'aumenta', simple: 'sube' },
  incremento: { preferred: 'aumento', simple: 'subida' },
  disminuir: { preferred: 'bajar', simple: 'bajar' },
  disminuye: { preferred: 'baja', simple: 'baja' },
  reduccion: { preferred: 'baja', simple: 'baja' },
  reducir: { preferred: 'bajar', simple: 'bajar' },
  reduce: { preferred: 'baja', simple: 'baja' },

  requerir: { preferred: 'pedir', simple: 'pedir' },
  requiere: { preferred: 'pide', simple: 'pide' },
  requieren: { preferred: 'piden', simple: 'piden' },
  exigir: { preferred: 'pedir con fuerza', simple: 'pedir' },
  exige: { preferred: 'pide', simple: 'pide' },

  doctrina: { preferred: 'doctrina', simple: 'ideas' },
  doctrinas: { preferred: 'doctrinas', simple: 'ideas' },
  ideologia: { preferred: 'ideología', simple: 'ideas políticas' },
  ideologias: { preferred: 'ideologías', simple: 'ideas políticas' },
  ideologico: { preferred: 'ideológico', simple: 'de ideas políticas' },

  economia: { preferred: 'economía', simple: 'economía' },
  economico: { preferred: 'económico', simple: 'de dinero' },
  economica: { preferred: 'económica', simple: 'de dinero' },
  mercado: { preferred: 'mercado', simple: 'compra y venta' },
  escasez: { preferred: 'falta', simple: 'falta' },
  desigualdad: { preferred: 'desigualdad', simple: 'no ser iguales' },

  libertad: { preferred: 'libertad', simple: 'poder elegir' },
  coercion: { preferred: 'presión', simple: 'obligar' },
  coercitivo: { preferred: 'que obliga', simple: 'que obliga' },
  voluntario: { preferred: 'voluntario', simple: 'a gusto' },
  voluntaria: { preferred: 'voluntaria', simple: 'a gusto' },

  complejidad: { preferred: 'complejidad', simple: 'lo difícil' },
  complejo: { preferred: 'complejo', simple: 'difícil' },
  compleja: { preferred: 'compleja', simple: 'difícil' },

  hipotesis: { preferred: 'hipótesis', simple: 'idea a probar' },
  conclusion: { preferred: 'conclusión', simple: 'cierre' },
  conclusiones: { preferred: 'conclusiones', simple: 'cierres' },
  concluye: { preferred: 'cierra', simple: 'cierra' },

  caracteristica: { preferred: 'rasgo', simple: 'rasgo' },
  caracteristicas: { preferred: 'rasgos', simple: 'rasgos' },
  peculiar: { preferred: 'especial', simple: 'especial' },

  manifestar: { preferred: 'mostrar', simple: 'mostrar' },
  manifiesta: { preferred: 'muestra', simple: 'muestra' },
  manifiestan: { preferred: 'muestran', simple: 'muestran' },
  expresar: { preferred: 'decir', simple: 'decir' },
  expresa: { preferred: 'dice', simple: 'dice' },
  expresan: { preferred: 'dicen', simple: 'dicen' },

  incompatible: { preferred: 'que no va', simple: 'que no va' },
  incompatibles: { preferred: 'que no van', simple: 'que no van' },
  incompatibilidad: { preferred: 'que no encajan', simple: 'que no encajan' },
  compatible: { preferred: 'que va', simple: 'que va' },

  predominante: { preferred: 'principal', simple: 'el que manda' },
  predomina: { preferred: 'manda', simple: 'manda' },

  legitimo: { preferred: 'justo', simple: 'con razón' },
  legitima: { preferred: 'justa', simple: 'con razón' },
  legitimidad: { preferred: 'justificación', simple: 'razón para valer' },
  arbitrario: { preferred: 'a capricho', simple: 'a gusto de uno' },
  arbitraria: { preferred: 'a capricho', simple: 'a gusto de uno' },
  arbitrariedad: { preferred: 'capricho', simple: 'capricho' },

  cohesion: { preferred: 'unión', simple: 'unión' },
  implicito: { preferred: 'sobrentendido', simple: 'no dicho' },
  implicita: { preferred: 'sobrentendida', simple: 'no dicha' },
  explicito: { preferred: 'claro', simple: 'dicho claro' },
  explicita: { preferred: 'clara', simple: 'dicha clara' },

  derecha: { preferred: 'derecha', simple: 'derecha política' },
  izquierda: { preferred: 'izquierda', simple: 'izquierda política' },
}

const INDEX = new Map<string, EasySynonym>()
for (const [k, v] of Object.entries(RAW)) {
  INDEX.set(stripDiacritics(k).toLowerCase(), v)
}

const CLITIC = /(la|las|lo|los|le|les|me|te|se|nos|os)$/i

/** Busca sinónimo fácil para una forma de token. */
export function lookupEasySynonym(normalized: string): EasySynonym | null {
  const key = stripDiacritics(normalized).toLowerCase().trim()
  if (!key) return null

  const direct = INDEX.get(key)
  if (direct) return direct

  if (CLITIC.test(key) && key.length > 6) {
    const base = key.replace(CLITIC, '')
    const hit = INDEX.get(base)
    if (hit) {
      const clitic = key.slice(base.length)
      return {
        preferred: attachClitic(hit.preferred, clitic),
        simple: attachClitic(hit.simple, clitic),
        definition: hit.definition,
      }
    }
  }

  if (key.endsWith('mente') && key.length > 8) {
    const stem = key.slice(0, -5)
    const stemHit =
      INDEX.get(stem) ?? INDEX.get(`${stem}o`) ?? INDEX.get(`${stem}a`)
    if (stemHit) {
      return {
        preferred: `de modo ${stemHit.preferred}`,
        simple: stemHit.simple,
        definition: stemHit.definition,
      }
    }
  }

  return null
}

function attachClitic(phrase: string, clitic: string): string {
  const p = phrase.trim()
  if (!p) return clitic
  if (!/\s/.test(p) && p.length <= 16) return `${p}${clitic}`
  return `${p}`
}
