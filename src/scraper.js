const axios = require('axios');
const cheerio = require('cheerio');

const {conectDB, closeDB } = require("./dataBase");
const collectionName = 'eventos';

var collection;

var newEvents = [];


function changeFormate(fecha) {
    if (fecha) {
        fecha = fecha.split('@');
        var fechaPartes = fecha[0].split(' ');
        var dia = fechaPartes[0];
        var mes = fechaPartes[1];
        var hora = fecha[1] ? fecha[1].trim() : '';

        var meses = { 'enero': 0,'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6,
            'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        
        var mesNumero = meses[mes.toLowerCase()];

        var fechaObjeto = new Date();
        fechaObjeto.setDate(parseInt(dia));
        fechaObjeto.setMonth(mesNumero); 
        fechaObjeto.setHours(hora ? parseInt(hora.split(':')[0]) : 0);
        fechaObjeto.setMinutes(hora ? parseInt(hora.split(':')[1]) : 0);
        fechaObjeto.setSeconds(0);
        if (hora.includes("pm")) {
            fechaObjeto.setHours(fechaObjeto.getHours() + 12);
        }
        var fechaFormateada = fechaObjeto.getFullYear() + '-' +
            ('0' + (fechaObjeto.getMonth() + 1)).slice(-2) + '-' +
            ('0' + fechaObjeto.getDate()).slice(-2) + ', ' +
            ('0' + fechaObjeto.getHours()).slice(-2) + ':' +
            ('0' + fechaObjeto.getMinutes()).slice(-2) + ':' +
            ('0' + fechaObjeto.getSeconds()).slice(-2);

        return fechaFormateada;

    }
}


// Esta función se encarga de procesar cada página individual.
async function fetchAndProcessPage(pageNumber) {
    const website = `https://merida.es/agenda/lista/p%C3%A1gina/${pageNumber}/`;

    try {
        const response = await axios.get(website);
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const events = [];

            const eventPromises = $('div.tribe-events-calendar-list__event-wrapper.tribe-common-g-col').map(async (index, element) => {
                let article = $(element).find('article');

                const imagenIni = article.find('div > a > img').attr('src');
                const descripcionBreve = article.find('div.tribe-events-calendar-list__event-description.tribe-common-b2.tribe-common-a11y-hidden p').text().trim();
                const urlEvent = article.find('a.tribe-events-calendar-list__event-title-link.tribe-common-anchor-thin').attr('href');
                const destacado = !!article.find('span.tribe-events-calendar-list__event-datetime-featured-text.tribe-common-a11y-visual-hide').text().trim();
                

                const eventResponse = await axios.get(urlEvent);
                if (eventResponse.status === 200) {
                    const eventPage = cheerio.load(eventResponse.data);

                    const titulo = eventPage('h1.tribe-events-single-event-title').text().trim();
                    let image = eventPage('.tribe-events-single-event-description.tribe-events-content p a img').attr('src') || eventPage('.tribe-events-single-event-description.tribe-events-content div a img').first().attr('src');
                    let fecha_inicio = eventPage('h2 span.tribe-event-date-start').text().trim();
                    let fecha_final =  eventPage('h2 span.tribe-event-date-end').text().trim();
                    const direccion = eventPage('div.tribe-events-meta-group.tribe-events-meta-group-venue dl dd.tribe-venue').text().trim();
                    const utlGooglemaps= eventPage('a.tribe-events-gmap').attr('href') || '';
                    const categoria= eventPage('dd.tribe-events-event-categories').text().trim()|| '';

                    let descriptionCompleta = [];
                    eventPage('.tribe-events-single-event-description.tribe-events-content p').each((i, elem) => {
                        descriptionCompleta.push($(elem).text().trim());
                    });
                    fecha_inicio = changeFormate(fecha_inicio) || '';
                    fecha_final = changeFormate(fecha_final) || '';
                    
                    eventId = 0;
                    return {titulo, imagenIni, descripcionBreve, image, fecha_inicio, fecha_final, urlEvent, direccion, descriptionCompleta , utlGooglemaps, categoria, destacado, eventId};
                }
            }).get(); // Convertir a un array real para que Promise.all pueda manejarlo

            const results = await Promise.all(eventPromises);
            results.forEach(event => {
                if (event) events.push(event);
            });

            return events;
        } else {
            console.error("Error al cargar la página:", response.status);
            return [];
        }
    } catch (error) {
        console.error("Error al realizar la solicitud:", error);
        return [];
    }
}



// Obtener el máximo eventId actual al iniciar el script
async function getMaxEventId() {
   
    const result = await collection.findOne({}, { projection: { eventId: 1, _id: 0 }, sort: { eventId: -1 } });
    console.log("Resultado de getMaxEventId:", result);

    return result ? result.eventId : 0;
}

async function saveEventToMongoDB(event) {
    
    var maxEventId = await getMaxEventId();
     // Incrementar el valor de eventId
     maxEventId++;

     // Asignar el nuevo valor de eventId al evento
     event.eventId = maxEventId;

    // Ver si existe el evento para evitar duplicados
    const existingEvent = await collection.findOne({
        $and: [
            { titulo: event.titulo },
            { fecha_inicio: event.fecha_inicio },
            { fecha_final: event.fecha_final }
        ]
    });

    if (existingEvent) {
        console.log("El evento ya existe en la base de datos, no se insertará:", event.titulo);
        
    }else{
        // Insertar el evento en la base de datos y agregarlo a la lista de eventos los cuales serás las notificaciónes
        await collection.insertOne(event);
        newEvents.push(event);
        console.log("Evento insertado:", event.titulo);

    }
    
}

// Función principal que gestiona el bucle de las páginas.
async function scrapEventsFromPages() {
    let allEvents = [];
    newEvents = [];
    console.log("Cargando eventos nuevos...");
    collection = await conectDB(collectionName);
    for (let i = 1; i <= 3; i++) {
        const pageEvents = await fetchAndProcessPage(i);
        allEvents = allEvents.concat(pageEvents);
    }

    for (const event of allEvents) {
        await saveEventToMongoDB(event);
    }

    await closeDB();
    console.log("Eventos insertados:", newEvents.length);
    return newEvents;
}


module.exports = {
    scrapEventsFromPages
  };
