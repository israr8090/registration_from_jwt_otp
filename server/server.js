import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connect from './database/dbconnect.js';
import router from './router/route.js';


const app = express();

//--middlewares--
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));
app.disable('x-powered-by'); //-less hackers know about our stack

const port = 8000;

//--HTTP get Request
app.get('/', (req, res) => {
    res.status(201).json("Home get request");
});


//--api routes--
app.use('/api', router)


//--start server only when we have calid connection-- 
connect().then(() => {
    try {
        app.listen(port, () => {
            console.log(`Server connected to port ${port}`)
        })
    } catch (error) {
        console.log("Connot connect to the server")
    }
}).catch(error => {
    console.log('Invalid database connection...!')
})


// app.listen(port, () => {
//     connect();
//     console.log(`Server connected to port ${port}`)
// })