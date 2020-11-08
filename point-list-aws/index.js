if (process.argv.length < 4) {
    console.log('Usage: node index.js <the bucket name> <the AWS Region to use>\nExample: node index.js my-test-bucket us-east-2');
    process.exit(1);
}
const express = require('express');
var AWS = require('aws-sdk');
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var bucket_name = process.argv[2];
var region = process.argv[3];
AWS.config.update({
    region: region
});
var app = express();
app.post("/add",function (req,res) {
    var body = [];
    req.on('data', function (data) {
        body.push(data);
        // limit file size to 100kb
        if (body.join("").length > 1e5) req.connection.destroy();
    });
    req.on('end', async function () {
        var state = 0;
        try {
            state = 1;
            var text = body.join("");
            state = 2;
            var req_json1 = JSON.parse(text);
            if(!("body" in req_json1)) {
                state = 3;
                throw new Error();
            }
            if(!("key" in req_json1)) {
                state = 4;
                throw new Error();
            }
            if(Object.prototype.toString.apply(req_json1.body) != "[object String]") {
                state = 5;
                throw new Error();
            }
            if(Object.prototype.toString.apply(req_json1.key) != "[object String]") {
                state = 6;
                throw new Error();
            }
            var params = {
                Body: req_json1.body, 
                Bucket: bucket_name,
                Key: req_json1.key+".csv"
            };
            var upload_promise = new Promise((resolve,reject)=>{
                state = 7;
                s3.putObject(params, function(err, data) {
                    if (err) {
                        state = 8;
                        console.log(err, err.stack); // an error occurred
                        reject();
                    } else {
                        state = 9;
                        console.log(data);           // successful response
                        resolve();
                    }
                });
            });
            upload_promise.catch(()=>{
                throw new Error();
            });
            await upload_promise;
            res.json({result:true,bucket : "https://" + bucket_name + ".s3." + region + ".amazonaws.com/"});
        } catch(e) {
            res.json({result:false,code:state});
        }
    });
});
app.post("/list",function(req,res){
    var body = [];
    req.on('data', function (data) {
        body.push(data);
        // limit body size to 10b
        if (body.join("").length > 1e1) req.connection.destroy();
    });
    req.on('end', async function () {
        var state = 0;
        try {
            state = 1;
            var params = {
                Bucket: bucket_name,
            };
            var upload_promise = new Promise((resolve,reject)=>{
                state = 2;
                s3.listObjects(params, function(err, data) {
                    if (err) {
                        state = 3;
                        console.log(err, err.stack); // an error occurred
                        reject();
                    } else {
                        state = 4;
                        var retList = [];
                        for(var x = 0; x < data.Contents.length;x++) {
                            retList.push( data.Contents[x].Key );
                        }
                        resolve(retList);
                    }
                });
            });
            upload_promise.catch(()=>{
                throw new Error();
            });
            var ret = await upload_promise;
            console.log(ret);
            res.json({result:true,data:ret});
        } catch(e) {
            res.json({result:false,code:state});
        }
    });
});
app.listen(3001,()=>{
    console.log("micro-service aws loaded http://localhost:3001/");
});