require("dotenv").config();
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT ;
const eventosRouter = require('./routers/eventos');
const usuariosRouter = require('./routers/usuarios');
const comentariosRouter = require('./routers/comentarios');

app.use(bodyParser.urlencoded({limit: '100mb',extended: true }));
app.use(bodyParser.json({limit: '100mb'}));


app.use('/eventos', eventosRouter);

app.use('/usuarios', usuariosRouter);

app.use('/comentarios', comentariosRouter);


app.get('/', (req, res) => {
    
    console.log('conect');
    res.send('conect');
    
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

  
