import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import mongoose from 'mongoose'
import userRouter from './src/controllers/users.js';

const app = express()
app.use(express.json())
app.use(cors())
dotenv.config()

app.get('/', function (req, res) {
    res.json({
        message: 'SejutaCita'
    })
});

app.use('/api', userRouter);

//default error
app.use((err, req, res, next) => {
    res.send(err.message)
})

app.listen(process.env.PORT, () => {
    console.log(`App listens to port ${process.env.PORT}`);
});

// Connect to DB
var uri = process.env.MONGODB_URI;
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
}).then(() => {
    console.log('Connect to DB success')
}).catch(err => {
    console.log('Connect to failed ' + err)
})