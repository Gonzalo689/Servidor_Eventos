const express = require('express')
const router = express.Router()

const {conectDB, closeDB } = require("../dataBase");
//Conexion
const collectionName = "usuarios";


// Encontrar todos los usuarios
// router.get('/', async (req, res) => {
//     try {

//         console.log("Buscando todos los usuarios");
//         const collection = await conectDB(collectionName);
//         const usuarios = await collection.find({}).toArray();
//         console.error('Usuarios encontrados:', usuarios.length);
//         res.status(200).json(usuarios);
//     } catch (error) {
//         console.error("Error al crear usuario:", error);
//         res.status(500).send("Error al crear usuario");
//     }finally {
//         await closeDB();
//     }
// })

// conseguir el usuario con el id dado
router.get('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log("Buscando un usuario con id: ", userId);
        const collection = await conectDB(collectionName);
        console.error(userId);
        const usuario = await collection.findOne({ id : userId });
        
        if (usuario) {
            console.error('Usuario encontrado:', usuario.id);
            res.status(200).json(usuario);
        } else {
            console.error('Usuario no encontrado');
            res.status(404).send('Usuario no encontrado');
        }
    } catch (error) {
        console.error("Error al encontrar usuario:", error);
        res.status(500).send("Error al encontrar usuario");
    }finally {
        await closeDB();
    }
})
//BuscarLike
router.get('/like/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log("Buscando like del usuario con id:", userId);
        const collection = await conectDB(collectionName);
        
        const eventId  = parseInt(req.query.eventId);
        console.log(eventId);

        let find = await collection.findOne(
            { id: userId, eventsLikeList: { $elemMatch: { $eq: eventId } } }
            );
        

        if (find) {
            console.log('tiene like', find);
            res.status(200).json({ isLiked: true });
        } else {
            console.error('No tiene like');
            res.status(200).json({ isLiked: false });
        }
    } catch (error) {
        console.error("Error al actualizar email del usuario:", error);
        res.status(500).send("Error al actualizar email del usuario");
    } finally {
        await closeDB();
    }
})
//Conseguir Favoritos
async function getfavorites (eventsLikeList,collection) {
    var listlike = [];
    for (let i = 0; i < eventsLikeList.length; i++) {

        const evento = await collection.findOne({ "eventId" : eventsLikeList[i] });
        listlike.push(evento);
    }
    return listlike;
}

async function getRecomends(eventsLikeList, collection) {
    const currentDate = new Date();

    if (eventsLikeList.length === 0) {
        return await collection.aggregate([
            { $match: { 
                fecha_inicio: { $gt: currentDate.toISOString() } 
            }},
            { $sample: { size: 10 } }
        ]).toArray();
    } else {
        const categoryCounts = {};
        for (let eventId of eventsLikeList) {
            const event = await collection.findOne({ "eventId": eventId });
            if (event && event.categoria) {
                const categories = event.categoria.split(',').map(c => c.trim());
                categories.forEach(categoria => {
                    if (!categoryCounts[categoria]) {
                        categoryCounts[categoria] = 1;
                    } else {
                        categoryCounts[categoria]++;
                    }
                });
            }
        }

        const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

        let recommendedEvents = [];
        for (let category of sortedCategories) {
            if (recommendedEvents.length >= 10) break;
            const regex = new RegExp(`\\b${category}\\b`, 'i');
            const events = await collection.aggregate([
                { $match: { 
                    categoria: { $regex: regex },
                    fecha_inicio: { $gt: currentDate.toISOString() } 
                }},
                { $sample: { size: 10 - recommendedEvents.length } }
            ]).toArray();
            recommendedEvents.push(...events);
        }

        // Si no hay suficientes eventos, rellenar con eventos aleatorios
        if (recommendedEvents.length < 10) {
            const additionalEvents = await collection.aggregate([
                { $match: { 
                    fecha_inicio: { $gt: currentDate.toISOString() } 
                }},
                { $sample: { size: 10 - recommendedEvents.length } }
            ]).toArray();
            recommendedEvents.push(...additionalEvents);
        }

        return recommendedEvents;
    }
}


router.get('/listRecomend/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log("Creando una lista de recomendados", userId);
        var collection = await conectDB(collectionName);
        

        const user = await collection.findOne({ id: userId });
        await closeDB();
        if (user) {
            const eventsLikeList = user.eventsLikeList || []; 
            
            collection = await conectDB("eventos");
            var listRecomend = await getRecomends(eventsLikeList, collection) || [];
            res.status(200).json(listRecomend);


        } else {
            console.error('Usuario no encontrado');
            res.status(404).send('Usuario no encontrado');
        }
        
    } catch (error) {
        console.error("Error al crear la lista: ", error);
        res.status(500).send("Error al crear la lista");
    } finally {
        await closeDB();
    }
})
//Buscar Lista Like
router.get('/likeList/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log("Buscando list liked del usuario con id:", userId);
        var collection = await conectDB(collectionName);
        

        const user = await collection.findOne({ id: userId });
        await closeDB();
        if (user) {
            const eventsLikeList = user.eventsLikeList || []; 
            
            console.log('Evento encontrado en la lista:');

            collection = await conectDB("eventos");
            var listlike = await getfavorites(eventsLikeList, collection) || [];
            res.status(200).json(listlike);


        } else {
            console.error('Usuario no encontrado');
            res.status(404).send('Usuario no encontrado');
        }
        
    } catch (error) {
        console.error("Error al encontrar la lista de eventos favoritos:", error);
        res.status(500).send("Error al encontrar la lista de eventos favoritos");
    } finally {
        await closeDB();
    }
})
// Actualizar usuario
router.put('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log("Actualizando email del usuario con id:", userId);
        const collection = await conectDB(collectionName);
        
        const updateFields  = req.body;

        const updatedUser = await collection.findOneAndUpdate(
            { id: userId },
            { $set: updateFields },
            { returnOriginal: false } // Para obtener el documento actualizado
        );

        if (updatedUser) {
            console.log('Email actualizado con éxito:', updatedUser);
            res.status(200).json(updatedUser);
        } else {
            console.error('Usuario no encontrado');
            res.status(404).send('Usuario no encontrado');
        }
    } catch (error) {
        console.error("Error al actualizar email del usuario:", error);
        res.status(500).send("Error al actualizar email del usuario");
    } finally {
        await closeDB();
    }
})
// Actulizar Lista Likeds
router.put('/list/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log("Actualizar la lista de like del usuario con id:", userId);
        const collection = await conectDB(collectionName);
        
        const eventId  = req.body.eventId;
        const addToFavorites = req.body.addToFavorites;

        let updatedUser;
        var isAdd ;

        if (addToFavorites) {
            updatedUser = await collection.findOneAndUpdate(
                { id: userId },
                { $addToSet: { eventsLikeList: eventId } }, 
                { returnOriginal: false }
            );
            isAdd = true;
        } else {
            updatedUser = await collection.findOneAndUpdate(
                { id: userId },
                { $pull: { eventsLikeList: eventId } },
                { returnOriginal: false }
            );
            isAdd = false;
        }
        console.log(isAdd);
        if (updatedUser) {
            console.log('Lista de eventos favoritos actualizada con éxito:', updatedUser);
            res.status(200).json({ isLiked: isAdd });
        } else {
            console.error('Usuario no encontrado');
            res.status(404).send('Usuario no encontrado');
        }
    } catch (error) {
        console.error("Error al encontrar el usuario:", error);
        res.status(500).send("Error al encontrar el usuario");
    } finally {
        await closeDB();
    }
})
// Obtener el máximo userId actual 
async function getMaxUserId(collection) {
    const result = await collection.findOne({}, { projection: { id: 1, _id: 0 }, sort: { id: -1 } });
    console.log("Resultado de getMaxEventId:", result);

    return result ? result.id : 0;
}
// Crear un usuario nuevo
router.post('/', async (req, res) => {
    try {
        console.log("Creando un nuevo usuario");
        const collection = await conectDB(collectionName);
        
        const newUser = req.body;
        var id = await getMaxUserId(collection)
        id++;
        console.log("id: ", id);
        
        newUser.id = id;
        newUser.eventsLikeList = [];
        await collection.insertOne(newUser);

        console.log('Usuario creado con éxito:', newUser);
        res.status(200).json(newUser); 
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).send("Error al crear usuario");
    } finally {
        await closeDB();
    }
})
//Actualizar img
router.put('/img/:id', async (req, res) => {
    try {
        const img = req.body.img; // Por ejemplo, si la imagen se envía en formato Base64
        
        const userId = parseInt(req.params.id);

        console.log("Actualizando img del usuario con id:", userId);
        const collection = await conectDB(collectionName);
        
        await collection.updateOne(
            { id: userId  }, 
            { $set: { profilePicture: img } } 
        );

        console.log('Imagen de perfil del usuario actualizada con éxito');
        res.status(200).send("Imagen de perfil del usuario actualizada con éxito");
    } catch (error) {
        console.error("Error al actualizar la imagen de perfil del usuario:", error);
        res.status(500).send("Error al actualizar la imagen de perfil del usuario");
    } finally {
        await closeDB();
    }
})
// Comprobar si el usuario existe
router.post('/checkUser', async (req, res) => {
    try {
        console.log("Comprobando usuario");
        const collection = await conectDB(collectionName);

        const { email, password } = req.body;
        
        const user = await collection.findOne({ email: email, password: password });

        if (user) {
            console.log('Usuario logeado con exito:', user);
            res.status(200).json(user); 
        }else{
            console.error('Usuario no encontrado');
            res.status(404).send('Usuario no encontrado');
        }

        
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).send("Error al crear usuario");
    } finally {
        await closeDB();
    }
});

router.get('/email/:email', async (req, res) => {
    try {
        console.log("Comprobando si existe la cuenta con email:", req.params.email);
        const collection = await conectDB(collectionName);

        const email = req.params.email;
        
        const user = await collection.findOne({ email: email });

        if (user) {
            console.log('ya existe un usuario con ese email', user.email);
            res.status(201).json({ isUsed: true });
        }else{
            console.error('Email sin uso');
            res.status(200).json({ isUsed: false });
        }
        
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).send("Error al crear usuario");
    } finally {
        await closeDB();
    }
});


module.exports = router