const { MongoClient} = require('mongodb');
const uri = process.env.DB_URI;
const dbName = process.env.DB_NAME ;
let client = null;


async function conectDB(nombreColeccion) {
    try {
        client = await MongoClient.connect(uri);
        console.log('Conexión establecida con la base de datos');

        const database = client.db(dbName);
        return database.collection(nombreColeccion);
        
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        throw error;
    }
}

async function closeDB() {
    try {
        if (client) {
            await client.close();
            console.log('Conexión cerrada correctamente');
        }else{
            console.log('Conexión no establecida');
        }
    } catch (error) {
        console.error('Error al cerrar la conexión con la base de datos:', error);
    }
}

module.exports = {
    conectDB,
    closeDB
};
