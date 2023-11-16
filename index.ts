import express from 'express'

const app = express();
app.use(express.static('../public'));

app.listen(5600, () => console.log('Listening on port 5600'));