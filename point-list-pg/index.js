const express = require('express'),
    csv = require('jquery-csv'),
    db = require('./models');
var app = express();
const sequelize = db.sequelize;
(async () => {
    try {
        await sequelize.authenticate();
        //const [results, metadata] = await sequelize.query( "CREATE EXTENSION Postgis;" );
        console.log('Connection has been established successfully.');
        const PointFile = db.pointfile1;
        const Point = db.point1;
        await sequelize.sync();
        app.post("/add",(req,res)=>{
            var body = [];
            req.on('data', function (data) {
                body.push(data);
                // limit file size to 100kb
                
                if (body.join("").length > 1e5) req.connection.destroy();
            });
            req.on('end', async function () {
                try {
                    var text = body.join("");
                    var json = JSON.parse(text);
                    console.log(json);
                    var list = csv.toArrays(json.data);
                    //console.log(list);
                    var pts = [];
                    for(var x = 0; x < list.length;x++) {
                        if(x===0) { // verifica cabeçalho
                            if( Object.prototype.toString.apply( list[x][0] ) !== "[object Number]") {
                                has_header = true;
                            }
                        }
                        if((x===0 && !has_header) || x > 0) {
                            var lat = parseFloat(list[x][0]);
                            var lng = parseFloat(list[x][1]);
                            var pt = [lat,lng];
                            pts.push(pt);
                        }
                    }

                    try {
                        var r1 = await PointFile.findAll({where: { file:json.file } });
                        for(var x = 0; x < r1.length;x++) {
                            //console.log("FOUND:",r1[x].toJSON());
                            var r2 = await Point.findAll({where : { file_id: r1[x].id } });
                            for(var y = 0; y < r2.length;y++) {
                                await r2[y].destroy();
                            }
                            await r1[x].destroy();
                        }
                    } catch(e) {
                        res.json({result:false,errors:[e.message]});
                        return;
                    }

                    var r = null;
                    var error = false;
                    try {
                        r = await PointFile.create({file:json.file});
                        console.log("@",r.id);
                    } catch(e) {
                        error = true;
                        res.json({result:false,errors:[e.message]});
                        return;
                    }

                    if(!error) {
                        try {
                            var arr = [];
                            for(var x = 0; x < pts.length;x++) {
                                arr.push({
                                    file_id : r.id,
                                    value : {
                                        type : 'Point', 
                                        coordinates: pts[x]
                                    }
                                })
                            }
                            await Point.bulkCreate(arr);
                        } catch(e) {
                            res.json({result:false,errors:[e.message]});
                            return;
                        }
                    }
                } catch(e) {
                    res.json({result:false,errors:[e.message]});
                    return;
                }
                res.json({result:true});
            });
        });
        app.listen(3002,()=>{ console.log("loaded http://localhost:3002/"); });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})();
