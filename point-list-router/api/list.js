var express = require('express'),
    http = require('http'),
    config = require('../config/config.js');
router = express.Router();
var last = new Date();
router.post('/', function (req,res) {
    var body = [];
    req.on('data', function (data) {
        body.push(data);
        // limit body size to 10b
        if (body.join("").length > 1e1) req.connection.destroy();
    });
    req.on('end', async function () {
        var errors = [];
        var mode = 0;
        var now = new Date();
        var diff = (+now - (+last));
        var result = null;
        last = now;
        // traffic shape 1 req / 2 sec to avoid bots.
        if(diff < 100) {
            errors.push("O servidor está ocupado. Tente mais tarde.");
            res.json({ep:"/api/list",result:false,errors});
            return;
        }
        try {
            // request list of files from s3-service
            try {
                mode = 1;
                // call micro service
                var aws_promise = new Promise((resolve,reject)=>{
                    var req = http.request(config.AWSHost + '/list',{
                        method : "POST"
                    },(res) => {
                        console.log(`STATUS: ${res.statusCode}`);
                        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                        res.setEncoding('utf8');
                        var resBodyAWS = [];
                        res.on('data', (chunk) => {
                            resBodyAWS.push(chunk);
                        });
                        res.on('end', () => {
                            try {
                                var resAWS = resBodyAWS.join("");
                                console.log(resAWS);
                                var json = JSON.parse(resAWS);
                                if(json.result) {
                                    resolve(json.data);
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
                    req.end();
                });
                aws_promise.catch(()=>{
                    throw new Error("");
                });
                result = await aws_promise;
            } catch(e) {
                res.json({ep:"/api/list",result:false,errors});
                return;
            }
            // return host bucket/file path
            res.json({ep:"/api/list",result:true,data:result});
            return;
        } catch(e) {
            console.log(e.message);
            errors.push("Houve um problema na requisição ao servidor.");
            res.json({ep:"/api/list",result:false,errors});
        }
    });
});
module.exports = router;