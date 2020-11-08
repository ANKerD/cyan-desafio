const express = require('express');
const fs = require('fs');
const app = express();
app.use('/api',require('./api'));
var reactIndex = express.static('../front-dev-main-react/build');
app.use(reactIndex);
app.use("/historico",reactIndex);
app.use("/envio",reactIndex);
app.use("/arquivo/:path",reactIndex);
app.use("/arquivo/:bucket/:path",reactIndex);
app.listen(80,()=>{
    console.log("loaded http://localhost");
});