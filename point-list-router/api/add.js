var express = require('express'),
    http = require('http'),
    csv = require('jquery-csv'),
    config = require('../config/config.js');
router = express.Router();

var last = new Date();
router.post('/', function (req,res) {
    var body = [];
    req.on('data', function (data) {
        body.push(data);
        // limit file size to 100kb
        if (body.join("").length > 1e5) req.connection.destroy();
    });
    req.on('end', async function () {
        var errors = [];
        var mode = 0;

        var now = new Date();
        var diff = (+now - (+last));
        last = now;
        // traffic shape 1 req / 2 sec to avoid bots.
        if(diff < 2000) {
            errors.push("O servidor está ocupado. Tente mais tarde.");
            res.json({ep:"/api/add",result:false,errors});
            return;
        }
        try {

            var text = body.join("");
            var req_json1 = JSON.parse(text);
            console.log(req_json1);
            // request format
            if(!(
                "path" in req_json1 && 
                "file" in req_json1 && 
                Object.prototype.toString.apply(req_json1.path) == "[object String]" &&
                Object.prototype.toString.apply(req_json1.file) == "[object String]"
            )) {
                errors.push("Formato inválido.")
                res.json({ep:"/api/add",result:false,errors});
                return;
            }
            if(req_json1.path.length>256) {
                errors.push("Formato de caminho inválido. O tamanho maximo para o caminho é de 256 caracteres.")
                res.json({ep:"/api/add",result:false,errors});
                return;
            }
            var arr = req_json1.path.split("/");
            if(!(arr.length == 3 && arr[0] == "" && arr[1]!= "" && arr[2] != "")) {
                errors.push("Formato de caminho inválido. O caminho deve estar no formato /pasta/arquivo.")
                res.json({ep:"/api/add",result:false,errors});
                return;
            }

            // parse csv check if its valid, must be cause front-end does the same job. if not, there is a threat.

            var list = csv.toArrays(req_json1.file);
            var pts = [];
            mode = 0;
            for(var x = 0; x < list.length;x++) {
                if(x===0) { // verifica cabeçalho
                    if( Object.prototype.toString.apply( list[x][0] ) !== "[object Number]") {
                        has_header = true;
                    }
                }
                if((x===0 && !has_header) || x > 0) {
                    try {
                        mode = 1;
                        var lat = parseFloat(list[x][0]);
                        if(isNaN(lat)) throw new Error();
                        mode = 2;
                        var lng = parseFloat(list[x][1]);
                        if(isNaN(lng)) throw new Error();
                        if(lat <= -90 || lat >= 90) {
                            errors.push("Latitude inválida.");
                            res.json({ep:"/api/add",result:false,errors});
                            return;
                        } else if(lng <= -180 || lng >= 180) {
                            errors.push("Longitude inválida.");
                            res.json({ep:"/api/add",result:false,errors});
                            return;
                        }
                    } catch(e) {
                        if(mode ==1) {
                            errors.push("Latitude inválida.");
                            res.json({ep:"/api/add",result:false,errors});
                            return;
                        } else if(mode ==2) {
                            errors.push("Longitude inválida.");
                            res.json({ep:"/api/add",result:false,errors});
                            return;
                        }
                    }
                }
            }


            // send file to s3-service
            var bucket = "";
            try {
                mode = 1;
                // call micro service
                var aws_promise = new Promise((resolve,reject)=>{
                    var req = http.request(config.AWSHost+'/add',{
                        method : "POST"
                    },(res) => {
                        console.log("aws add")
                        res.setEncoding('utf8');
                        var resBodyAWS = [];
                        res.on('data', (chunk) => {
                            resBodyAWS.push(chunk);
                        });
                        res.on('end', () => {
                            try {
                                var resAWS = resBodyAWS.join("");
                                var json = JSON.parse(resAWS);
                                if(json.result) {
                                    resolve(json.bucket);
                                    return;
                                }
                                console.log(json);
                                errors.push("Houve um problema de gravação no servidor. Código: 3.");
                                reject();
                            } catch(e) {
                                errors.push("Houve um problema de gravação no servidor. Código: 1.");
                                reject();
                            }
                        });
                    });
                    req.on('error', (e) => {
                        console.error(`Falha Crítica : Micro serviço aws fora do ar : ${e.message}`);
                        errors.push("Houve um problema de gravação no servidor. Código: 2.");
                        reject();
                    });
                    req.write(JSON.stringify({key: req_json1.path, body : req_json1.file }));
                    req.end();
                });
                aws_promise.catch(()=>{
                    throw new Error("");
                });
                bucket = await aws_promise;
            } catch(e) {
                res.json({ep:"/api/add",result:false,errors});
                return;
            }
            // register on db
            try {
                mode = 2;
                // call micro service
                var point_pg_promise = new Promise((resolve,reject)=>{
                    var req = http.request(config.PGHost+'/add',{
                        method : "POST"
                    },(res) => {
                        console.log("pg add")
                        res.setEncoding('utf8');
                        var resBodyPPG = [];
                        res.on('data', (chunk) => {
                            resBodyPPG.push(chunk);
                        });
                        res.on('end', () => {
                            try {
                                var resPPG = resBodyPPG.join("");
                                console.log(resPPG);
                                var json = JSON.parse(resPPG);
                                if(json.result) {
                                    resolve();
                                    return;
                                }
                                console.log(json);
                                errors.push("Houve um problema de gravação no servidor. Código: 3.");
                                reject();
                            } catch(e) {
                                errors.push("Houve um problema de gravação no servidor. Código: 1.");
                                reject();
                            }
                        });
                    });
                    req.on('error', (e) => {
                        console.error(`Falha Crítica : Micro serviço aws fora do ar : ${e.message}`);
                        errors.push("Houve um problema de gravação no servidor. Código: 2.");
                        reject();
                    });
                    req.write(JSON.stringify({file: bucket + req_json1.path, data : req_json1.file }));
                    req.end();
                });
                point_pg_promise.catch(()=>{
                    throw new Error("");
                });
                (async ()=>{
                    try {
                    await point_pg_promise;
                    } catch(e){}
                })();
            } catch(e) {
                // ignore database errors cause it is already saved on aws, so it can be recovered, for the sake of user.
            }
            res.json({ep:"/api/add",result:true,path:req_json1.path});
            return;
        } catch(e) {
            console.log(e.message);
            errors.push("Houve um problema na requisição ao servidor.");
            res.json({ep:"/api/add",result:false,errors});
        }
        
    });
});
module.exports = router;