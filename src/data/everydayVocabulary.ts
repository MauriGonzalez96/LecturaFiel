/**
 * Vocabulario de uso cotidiano / lector medio.
 * Enfoque: listar lo “normal”; lo que no aparece en un capítulo
 * se busca como candidata (arcaica / difícil / culta) y se reemplaza
 * si hay sinónimo y el nivel de intervención lo pide.
 */
import {
  COMMON_SPANISH,
  isCommonSpanish,
  stripDiacritics,
} from './commonSpanish'
import { isUserEveryday } from './userEveryday'

/** Longitud mínima para marcar una palabra fuera del uso cotidiano. */
export const OUTLIER_MIN_LENGTH = 5

/** Ampliación cotidiana (lectura corriente, sin jerga académica). */
const EXTRA_CLEAN = `
abrir acabar aceptar acercar acompanar acordar actividad actual acuerdo
adelante ademas adentro adulto afuera agarrar agua alegre alma almorzar
amar amigo amistad amor anoche anotar anio aparte apenas apoyar aprender
arbol asunto atras ayudar azul bailar bajar bastante bebe beber belleza
bello blanco boca bolsillo bosque bueno buscar cafe caer calle cama cambiar
camino campo cansado cantar cara carrera carta casa casi caso causa
celebrar centro cerca cero cerrar chico cielo ciencia cierto cinco cine
ciudad claro clase coche cocina coger cola colegio color comenzar comer
comida comprar comprender comun conocer conseguir construir contar
contento continuar corazon correr corto cosa crear crecer creer cruz
cuadro cuerpo cuidado cumplir deber decidir decir delante demasiado
dentro deporte derecho desaparecer despues dibujar dinero dios doctor
dolor dormir duda dudar dulce durante duro edad edificio educacion ejemplo
ejercicio eleccion elegir empezar empleo empresa encontrar enfermedad
enfermo ensenar entender enterarse entonces entrada entrar equipo error
escoger escribir escuela escuchar especial esperar esposo esposa estrella
estudiar estudio europea exacto excelente existir exito experiencia
explicar familia famoso feliz feo fiesta final finalmente finca flor fondo
forma formar foto frase frente frio fuego fuerte futuro gana ganar gente
golpe gracias grande grupo guardar guerra gustar hablar hacer hallar
hermano hermosa hermoso hija hijo historia hombre hora hospital hotel hoy
huevo idea igual imagen importante incluir indicar informacion ingles
inicio inmediato intentar interesante internacional internet invierno
izquierda joven juego jugar junto kilo kilometro lado lago lagrima largo
leer lejos lengua levantar ley libertad libre libro ligero limpiar linea
lista llamar llegar lleno llevar llover lluvia luego lugar madre
madrugada malo manana manera mano mar marzo masa matar mayo mayor media
medico medio mejor memoria menor mensaje mes mesa meter metodo metro
miedo mientras mil minuto mirar mismo mitad modelo momento montar montana
morir mostrar motivo mujer mundo musica nacer nacional natural necesario
necesitar negro nevar nieve nino nina noche nombre norte notar noticia
noviembre numero nuevo objeto obligar obra oferta oficina oido oir ojo
olor olvidar once opinion oportunidad orden oreja organo origen oro
oscuro otono padre pagar pais palabra pan pantalla papa papel parar
parecer pareja parte partido pasar paso pato paz pecho pedir pegar pelea
peligro pelo pensar peor pequeno perder perfecto periodico permiso perro
persona pesar peso pie piedra piel pierna pieza piloto pintar piso placa
plan plato playa plaza pobre poder policia politica poner puerta popular
posible pozo preferir pregunta preguntar prensa preocupar preparar
presente presidente primero primavera principio problema proceso profesor
profundo programa pronto propio proximo prueba publico pueblo puesto
punto puro quedar querer queso quitar radio rapido raro rato razon real
realidad recibir reciente recordar recorrer recurso red regalar regalo
region reina reir relacion religion reloj repetir resolver responder resto
resultado reunir reunion revista rico rio rojo ropa rostro rueda ruido
saber salir salsa salud salvar sangre seco seguir seguro semana sembrar
sencilla sencillo sentar sentido sentir senor senora separar septiembre
serio servicio servir siglo siguiente silencio silla simple sistema
situacion sol solo solucionar sombra sonar soplar sorpresa subir sucio
suelo sueno suficiente sugerir superficie superior sur tal tambien
tarjeta taxi teatro telefono television temprano terminar terraza texto
tiempo tienda tierra tipico tipo tirar tocar todavia todo tomar tonto
tormenta trabajar trabajo traducir traer traje tranquilo trece treinta
tren tres triste tronco tropa tumba turista ultimo universitario
universidad usar usual vacaciones valer valle vapor varias varios
vaso vecino vehiculo veinte velocidad vencer vender venir ventana ver
verano verbo verde verdad viaje viejo viento viernes vino visita visitar
vuelo volver voz vuelta zapato zona
`.replace(/\s+/g, ' ').trim()

const EXTRA_SET: ReadonlySet<string> = new Set(
  EXTRA_CLEAN.split(' ').filter(Boolean).map((w) => stripDiacritics(w)),
)

/** ¿Es palabra de uso cotidiano / lector medio? (incluye las que agregó el usuario) */
export function isEverydayWord(normalized: string): boolean {
  const key = stripDiacritics(normalized)
  if (isUserEveryday(key)) return true
  if (isCommonSpanish(key)) return true
  return EXTRA_SET.has(key)
}

export function everydayVocabularySize(): number {
  return COMMON_SPANISH.size + EXTRA_SET.size
}

export { stripDiacritics }
