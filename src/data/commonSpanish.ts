/**
 * Vocabulario de alta frecuencia en español (uso cotidiano / periodístico).
 * Sirve como filtro negativo: si una palabra NO está acá ni en el léxico semilla
 * y supera umbrales mínimos, se considera candidata de rareza (N2, solo glosario).
 *
 * No es un corpus completo: es una lista de referencia compacta (~1200 lemas/formas)
 * orientada a lectura narrativa. Se puede ampliar sin cambiar el detector.
 */
const RAW = `
a abajo abandono abierto abogado abril abrir abuelo acabado acabar acaso acceso
accion aceite acento acepta aceptar acerca acero acerca acercar acompanar acuerdo
adelante ademas adentro adios adjetivo administracion admirar adolescente adoptar
adulto aeropuerto aficion afuera agenda agosto agua aguacate agudo aguja ahi ahora
aire ajedrez ajo al ala alambre alacena alarma alcalde alcanzar alcohol alegre alegria
alejar aleman algo alguien algun alguna algunos alimento alma almorzar alojamiento
alrededor alto altura alumno alli ama amable amante amargo amarillo ambiente ambos
amenaza america amigo amistad amor ampliar amplio analisis anciano ancho andando andar
angel angulo animal aniversario anoche anotar antecedente anterior antes antiguo anunciar
anuncio anillo ano anadir anadir anadir apagar aparato aparecer apellido apenas apertura
apellido aplicar apunta apuntar apoyo aprender apresurar aprobar aproximadamente aquel
aquella aquellos aqui arbol archivo area arena argentino argumento arma armada armario
arreglar arriba arroz arte articulo artista asado ascensor asegurar asi asiatico asiento
aspecto asombro asunto ataque atencion atento atraer atras atrasado atravesar audicion
aumentar aunque aunque aunque auto autobus autobus automovil autor autoridad avance
avanzar ave avenida averiguar avion aviso ay ayer ayuda ayudar azucar azul
bailar baile bajar bajo balcon balon banana banco bandera banquete bar barato barrio
base basico basura bateria bebe beber belleza bello besar biblioteca bicicleta bien
bienestar bigote billete blanco blando bloque boca boda boleto bolsa bolsillo bomba
bonito bosque botella boton brazo breve brillante brindar buen buena buenos buscar
caballero caballo cabello cabeza cabo cada cadena caer cafe caida caja calabaza calcular
caldo calidad caliente calle calor cama camarero cambiar cambio caminar camino camion
camisa camiseta campana campeon campo canal cancion cansado cantar cantidad capa capaz
capital capitan capitulo cara caracter caracteristica carbon cardenal carga cargar cargo
cariño carne caro carrera carro carta cartera casa casado casarse casi caso castellano
castillo catedral categoria causa causar cazar celebrar celeste celular cemento cena
cenar central centro cepillo cerca cercania cerebro cero cerrar cesped chaqueta cheque
chico chile chino chocolate ciclista cielo ciencia cientifico cierto cigarrillo cima
cinco cine cinta circulo circunferencia cita ciudad claro clase clasico clasificar
cliente clima clínica club coche cocina cocinar coche codigo codo coger cola coleccion
colegio colgar colina color colorado columna combate comenzar comer comercial comercio
comida como compañero compañia completo comprar comprender compromiso comun comunicar
comunidad con concepto concierto concluir concreto condicion conducir conferencia
confianza confirmar conflicto conforme confundir congélado conocer conocimiento
conquista conseguir consejo conservar considerar consistente consistir constante
construir consulta consumir contacto contar contemplar contenido contento contestar
continente continuar contra contrario control controlar convencion conversacion
convertir corazon corbata cordero corona correcto correo correr cortar corte corto
cosa cosecha costa costo costumbre crear creativo crecer credito creer criado crimen
crisis cristal critica cruz cuaderno cuadrado cuadro cual cualquier cuando cuanto
cuarenta cuarto cuatro cuba cubierta cubierta cubierto cubrir cuello cuenta cuento
cuerda cuerpo cuestion cuidado cuidar culpa culpable cultivo cultura cumbre cumpleanos
cumplir cuota cura curiosidad curso curva cuyo
dama daño danzar dar dato de debajo decidir decir decision declarar dedo defender
defensa definido dejar del delante delgado delicioso demais demanda demas demasiado
democracia demostrar dentista dentro departamento depender deporte deporte deportivo
depositar derecho desafiar desarrollo descansar descanso descargar descender describir
descubrimiento descubrir desde desear deseo desierto desigual desnudo despacio despedir
despertar despues destino destruir detalle detener determinado devolver dia diabolo
diablo dialogo diamante diario diccionario dicha diciembre dictar diente diferencia
difícil difícil dificil dificil dificil dignidad dinero dios direccion directo director
dirigir disciplina discurso discutir diseñar diseño disfrutar disminuir distinto
distrito diverso divertido dividir divorcio doblar doble doce documento dolar dolor
domicilio domingo don donde dormir dosis drama droga duda dudar dueño dulce durante
duro
e echado echar edad edil edificacion edificio educacion educar efectivo efecto egoismo
ejemplo ejercito el eleccion electricidad elefante elegante elegir elemento elevado
eliminar ella ellas ello ellos embargo empezar empleado empleo empresa enamorar
encantar encargar encima encontrar enemigo energia enero enfermo enfocar enfrente
engaño enojar enorme enseña enseñar entender enterar entonces entrada entrar entre
entregar entrevista enunciado envolver epoca equilibrado equipo equivalente error
escala escalera escena escribir escritor escrito escuchar escuela ese esencia esfuerzo
eso España especial especie especificar espectáculo espejo esperanza esperar esposo
esquina esta estacion estado estadounidense estante estar este estilo estimar esto
estomago estómago estrella estructura estudiante estudiar eterno europa europeo
evitar exacto examen excelente excepto exceso excluir exito existen existir exito
experiencia experimentar experto explicar explorar expresion extender extranjero
extraño extremo
fabrica facil facultad falda falsa falso falta faltar familia famoso fantasma farmacia
favor favorito fecha feo feria ferrocarril festival fiebre fiesta figura fijar fila
filosofia fin final finalmente fingir firma firmar fisico flojo flor florecer fondo
forma formal formar formula foto fotografia frase frente fresco frio fruta fuego
fuente fuera fuerza funcion funcionar fundacion futuro
gafas galeria gana ganar garage garantia gas gasolina gastar gato general generacion
genero gente gesto gigante gimnasio girar globo gobernar gobierno golpe golpear goma
gordo gota gozar grado graduado gran grande grandeza gratis grave greca griego gris
gritar grito grupo guante guardar guerra guía guía guitarra gustar gusto
haber habilidad habitacion habitante hablar hace hacer hacia hacienda hallar
hamburguesa hasta hay haya haz hecho helado hermano hermoso hero héroe hielo
hierba hierro higado hija hijo hilo historia historico hogar hoja hombre hombro
hondo honor hora horizonte horrible hospital hotel hoy hueco hueso huevo humano
humedad humor hundir
idea ideal idioma iglesia igual igualdad imagen imaginar impor importante imposibilidad
imposible impresion imprimir incluir incluso indicar individuo industria infancia
infierno informacion informar informe ingles inicio injusto inmediato inmenso
inocente insecto insistir instante instituto instrumento inteligencia inteligente
intencion interesante interesar internacional internet interpretar interruptor
intervalo intervenir entrevista íntimo inundacion inutil invadir inventar invierno
invitar ir isla izquierda
jabon jardin jarra jefe joven joya juego juez jugador jugar julio junio junto juridico
justicia justo
kilometro
la labio lado ladrillo ladrón lago lagrima lamentar lana langosta lapiz largo lástima
latino lavar le leccion leche lector lectura leer legal legumbre lejos lengua lenguaje
lento leon letra levantar ley libertad libre libreria libro limon limpio linea lista
listo literatura llamar llegada llegar llenar lleno llevar llorar lluvia lo loco
logico lograr lomo los lucha luchar luego lugar luna lunes luz
madre madrugada maestro magnífico maíz mal mala maleta malo mama mañana mancha
mandar manera manga mano manta manzana mañana maquina mar maravilla marca marcar
marco marfil marido marino mariposa martes marzo mas masa mascara mata matar materia
material matrimonio mayo mayor mayoria me mecanico medalla media medico medio medir
mejilla mejor mejorar melón memoria menor menos mensaje mensajero mente mentir menu
mercado mercurio mes mesa metal metodo metro mexicano miedo miembro mientras
mil milagro militar millón minimo ministro minuto mio mirar mismo mitad mixto
modelo moderno modo mojado molestar momento moneda mono montaña montar monte
monumento moral morder morir mostrar motivo motor moto mover movimiento mucho
mudar mujer mundial mundo municipio museo musica muy
nacer nacional nada nadie nariz narrar natalicio natural naturaleza navegar necesario
necesidad necesitar negativo negocio negro nervio nervioso neutro nevada ni niebla
nieve ninguna ninguno niño nivel no noche nombre norma norte nos nosotros nota
notar noticia noviembre nube nuestro nueve nuevo numero nunca
objetivo objeto obligar obra obrero observar obtener ocasion occidente oceano ocho
octubre ocultar ocupar ocurrir oeste oferta oficial oficina ofrecer oido oir ojo
ola oler olivo olor olvidar once onda once once once once once once once once
operacion opinion oponer oportunidad oposicion oracion oral orden ordenar ordinario
oreja organo organismo organizacion organizar orgullo origen original orilla oro
oscuros oscuridad oso otra otro oveja oxigeno
padre paga pagar pagina pais paisaje palabra palacio palma pan panaderia pantalla
pantalon papa papel paquete par para parado paradoja paraguas paralelo parecer pared
pareja parentesco parque parte participar particular partida partido partir pasado
pasar paseo pasion paso pasta pastel patata patente paterno patio pausa paz
pecado pecho pedagogia pedido pedir pegar pelea pelear peligro pelo pelota pena
pensar pension peor pequeño pera percibir perder perfecto perfil periodico periodista
permanecer permiso permitir pero perro persona personaje personal personalidad
perspectiva pesar peso petroleo pez piano picante picar pie piedra piel pienso
pierna pieza pila piloto pintar pintura piso pista pizarra placa plan planear
planeta planta planta plantel plata platano plato playa plaza pleno plomo pluma
población pobre poco poder poderoso poesia poeta policia politica politica polvo
pollo poner popular por porcentaje porque portal portafolio porteño portero
portugues poseer posibilidad posible posicion positiva positivo posta postal
posterior postre potencial potro pozo practica practicar precio preciso preferir
pregunta preguntar premio prensa preocupar preparar presencia presentar presidente
preso prestamo prestar presupuesto pretender primer primera primero principio
privacidad privado probable problema proceso procesar procura procurar producir
producto profesional profesor profundo programa progresar progreso prohibir
promesa prometer promover pronto propiedad propio proporciar proporcion proposito
propuesta proposito propio propio propio propio propio propio propio propio
proteger protesta protestar provincial proximo proyecto prueba psicologia
publicar publico pueblo puente puerta puerto pues puesto pulmon punto puntual
puro
que quedar queja quejar quemar querido querer queso quimica quince quinto quitar
quiza
radio raiz rama ramo rapido raro rato raton rayo raza razon reaccion real
realidad realizar recien reciente recipiente reclamar recog recog recog recog
reconocer recordar recorrer recuerdo reducir referir reforzar refresco regalo
regar regimen region regresar regular reina reir relacion relacionar relativamente
relato religioso reloj rellenar remar remar remar remar remar remar remar remar
remedio remoto rena renunciar reparar repente repetir reportaje reportero
representar republica rescate reservar residir resignar resistencia resistir
resolver respeto respirar responder respuesta responsable resto resultado
resultar resumen retirar retiro reunir reunion revista rey rico ridiculo
riesgo rio riqueza ritmo rito rival robar robo robot robusto roca rodilla
rojo roma romano romper ropa rosa rost rost rost rost rost rost rost rost
roto rubio ruido ruina ruta
saber sabio sable sabor sacar sacerdote sacrificio sala salario salida salir
salón salsa saltar salto salud saludar salvar san sangre santo sapo sardina
sarten satelite satisfacción satisfacer seco secretario secreto sector secuencia
seguida seguido seguir segun segundo seguridad seguro seis selva semana semejante
semestre semilla senal senalar sencillo senda seno sensacion sentido sentir
separar septiembre ser serie serio servicio servir sesenta sesion set setenta
sexo sexual si siempre siete siglo siguiente silencio silla simple simplemente
sin sinceridad sino sistema sitio situacion sobre sociedad socio sol solamente
soldado soleado solido solo soltar solucion sombra sombrero sonar sonido sonreir
sonrisa sopa soplar sordo sorprendente sorprender sospecha sospechar substance
suave subida subir suceder sucio sud sudor suegro sueldo suelo sueno suerte
suficiente sufrir sugerir suite sumar superior supermercado supuesto sur
superficie surgir susurro
tabaco tabla taco táctica tal talento taller tamaño también tampoco tan
tanto tapa tapar tarde tarea tarjeta taxi te teatro tecnico tecnologia techo
tecla teclado tejer tela telefono television tema temblar temperamento temperatura
templo temporada temprano tendencia tener tennis tension teoria teoria teoria
tercer tercero terminacion terminar termino terraza terrible territorio terror
tesis texto ti tienda tiempo tienda tierra tigre tijera timbre timid tipo
título tocar todavia todo todos tomar tomate tono tonto tormenta torno
toro torre torta total trabajador trabajar trabajo tradicion tradicional
traducir traer trafico tragedia traje trampa tranquilidad tranquilo transformar
transporte tras trasero tratar través tres tribunal triste tristeza triunfo
tronco tropa tropezar trozo tu tubería tubo tumba tunel turismo turista
turno tut tut tut tut tut tut tut tut
u ubicacion ultimo un una unico unidad unir universidad universo uno uña
urgente usar uso usted usual utiles util utilidad uva
vaca vacacion vacio vago vainilla valencia valer valiente valor valvula
vapor vaquero variedad varios vaso vecino vegetal vehiculo veinti veinte
vejez velocidad vencer vender venir ventana ver verano verbo verdad verde
veredicto vergüenza verificar verso vertical vestido vestir vez via viaje
viajar vicio victima victoria vida video vidrio viejo viento viernes
vigilancia vigilar villa vino violencia violento virgen virtual virtud
visita visitar víspera vista visto vitamina viuda vivir vivo vocabulario
volante volar voleibol voluntad volver vos voz vuelo vuelta vuestro
y ya yacer yate yerba yo yoga yogurt yunque
zafiro zanahoria zapato zona zoo zoologico
adversario filosofo oradora orador publico publica muchedumbre claridad
verdad disputa victoria facil facil rigor plaza gentio ridiculo serio
asunto empeño empeño insistia distorsionar intimidar refuto recorrido
exhausto distancia considerable fluia rocas leve posaba paisaje habitacion
rival estado afirma admite disfraces recuerdan aplaudia argumento fallo
calculo cambio plan hallaron piedra ruinas aparecio largo
`.replace(/\s+/g, ' ').trim()

/** Set de formas normalizadas (sin tildes) de vocabulario frecuente. */
export const COMMON_SPANISH: ReadonlySet<string> = new Set(
  RAW.split(' ').filter(Boolean).map((w) => stripDiacritics(w)),
)

const FUNCTION_WORDS = new Set(
  `
a al algo alguien algun alguna algunos ante antes aquel aquella aquellos aqui
asi aunque bajo bien cada como con contra cual cuales cualquier cuando cuanto
de del desde donde durante e el ella ellas ello ellos en entre era eran es
esa esas ese eso esos esta estas este esto estos fue fueron ha haber habia
han hasta hay la las le les lo los mas me mi mis mucho muchos muy nada nadie
ni ningun ninguna no nos nosotros nunca o os otra otro para pero poco pocos
por porque pues que quien quienes se ser si siempre sin sobre su sus tambien
te tener ti tu tus un una uno unos usted ustedes va van vamos vos yo ya y
`.replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(stripDiacritics),
)

export function stripDiacritics(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** ¿Forma demasiado común para considerarla rara? */
export function isCommonSpanish(normalized: string): boolean {
  const key = stripDiacritics(normalized)
  return FUNCTION_WORDS.has(key) || COMMON_SPANISH.has(key)
}

/**
 * Umbral para candidatas por rareza (fuera del léxico semilla).
 * Conservador: palabras cortas suelen ser frecuentes o nombres propios.
 */
/** Conservador: evita ruido con palabras cortas frecuentes fuera de la lista. */
export const RARITY_MIN_LENGTH = 7
