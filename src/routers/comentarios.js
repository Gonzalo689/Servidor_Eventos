const express = require('express')
const router = express.Router()

const {conectDB, closeDB } = require("../dataBase");
//Conexion
const collectionName = "comentarios";

function getCurrentDate() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0
    const day = String(date.getDate()).padStart(2, '0');

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

router.get('/', async (req, res) => {
    try {
        console.log("Buscando todos los comentarios");
        const collection = await conectDB(collectionName);
        const coments = await collection.find({}).toArray();
        console.log("Eventos encontrados: ",coments.length)
        res.json(coments);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error interno del servidor");
    } finally {
        await closeDB();
    }
});

router.get('/:id', async (req, res) => {
    try {
        
        const eventId = parseInt(req.params.id);
        console.log("Buscandolos comentarios: ", eventId);
        const collection = await conectDB(collectionName);
        const comentarios = await collection.find({ idPost: eventId }).toArray();
        
        if (comentarios.length > 0) {
            console.log('Comentarios encontrados:', comentarios.length);
            res.status(200).json(comentarios);
        } else {
            console.error('No se encontraron comentarios');
            res.status(404).send('No se encontraron comentarios');
        }
    } catch (error) {
        console.error("Error al encontrar comentarios:", error);
        res.status(500).send("Error al encontrar comentarios");
    }finally {
        await closeDB();
    }
})

async function getMaxUserId(collection) {
    const result = await collection.findOne({}, { projection: { id: 1, _id: 0 }, sort: { id: -1 } });
    console.log("Resultado de getMaxEventId:", result);

    return result ? result.id : 0;
}
// Crear un usuario nuevo
router.post('/', async (req, res) => {
    try {
        console.log("Crear nuevo comentario");
        const collection = await conectDB(collectionName);
        
        const coment = req.body;
        var id = await getMaxUserId(collection)
        id++;
        
        coment.fecha = getCurrentDate();
        coment.id = id;
        await collection.insertOne(coment);

        console.log('comentario creado:', coment);
        res.status(200).json(coment); 
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).send("Error al crear usuario");
    } finally {
        await closeDB();
    }
})
router.delete('/:id', async (req, res) => {
    try {
        console.log("Eliminar comentario por ID");
        const collection = await conectDB(collectionName);

        const comentId = parseInt(req.params.id);
        const result = await collection.deleteOne({ id: comentId }); 

        if (result.deletedCount === 0) {
            console.log(`No se encontró comentario con id: ${comentId}`);
            res.status(404).send(`No se encontró comentario con id: ${comentId}`);
        } else {
            console.log(`Comentario con id ${comentId} eliminado`);
            res.status(200).send(`Comentario con id ${comentId} eliminado`);
        }
    } catch (error) {
        console.error("Error al eliminar comentario:", error);
        res.status(500).send("Error al eliminar comentario");
    } finally {
        await closeDB();
    }
});



module.exports = router