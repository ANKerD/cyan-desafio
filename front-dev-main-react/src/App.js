import './App.css';

import { 
    RouterHost, // used in App
    BucketHost // used in Arquivo
} from "./config.js";

import {
    BrowserRouter as Router, // used in Main
    Switch, // used in Arquivos, App
    Route, // used in Arquivos, App
    Link, // used in Historico, App
    useRouteMatch, // used in Arquivo, Arquivos
    useParams, // used in Arquivo
    useHistory // used in App
} from "react-router-dom";

// used in MAP1, Historico, App
import { useState } from 'react';

// used in MAP1, App
import csv from 'jquery-csv/src/jquery.csv.js';

// used in MAP1
import { Map, GoogleApiWrapper, Marker, InfoWindow  } from 'google-maps-react';

//>>CLASS:MAP1
var MAP1 = GoogleApiWrapper({
    apiKey: 'AIzaSyDnPaJl8tHdyBaCaJawMwJvSOzCTo4vwW4'
})(function(props) {
    var [ marks, setMarks ] = useState([]);
    var [ center, setCenter ] = useState({lat:0,lng:0});
    var [ info, setInfo ] = useState({lat:0,lng:0});
    var [ loading, setLoading ] = useState(true);

    var [ showInfo, setShowInfo ] = useState(false);
    var [ activeMarker, setActiveMarker ] = useState({});
    
    function onMarkerClick(props, marker, e) {
        setInfo({ lat : marker.position.lat(),lng : marker.position.lng() });
        setActiveMarker(marker);
        setShowInfo(true);
    }
    function onClose(props) {
        if (showInfo) {
            setShowInfo(false);
            setActiveMarker(null);
        }
    };

    if(loading) {
        
        (async ()=>{
            var req = await fetch(props.url);
            var text = await req.text();
            console.log(text,props);
            var list = csv.toArrays(text);
            var _marks = [];
            var count = 0;
            var sum_center = [0,0];
            var has_header = false;
            for(var x = 0; x < list.length;x++) {
                if(x===0) { // check header
                    if( Object.prototype.toString.apply( list[x][0] ) !== "[object Number]") {
                        has_header = true;
                    }
                }
                if((x===0 && !has_header) || x > 0) {
                    var lat = parseFloat(list[x][0]);
                    var lng = parseFloat(list[x][1]);
                    console.log(lat,lng);
                    sum_center[0] += lat;
                    sum_center[1] += lng;
                    _marks.push(
                        <Marker position={{lat,lng}} onClick={onMarkerClick}/>
                    );
                }
            }
            sum_center[0] /= _marks.length;
            sum_center[1] /= _marks.length;
            console.log(sum_center);
            setLoading(false);
            setCenter({lat:sum_center[0],lng:sum_center[1]});
            setMarks(_marks);
        })();
    }
    //>>MAP1.render
    return (
        <div
        style={{width:"600px",height:"600px"}}
        >
        <Map
        google={props.google}
        zoom={14}
        style={{
            width: '100%',
            height: '100%',
            position: 'relative'
        }} 
        containerStyle={{
            width:'100%',
            height:'100%',
            position:'relative'
        }} 
        initialCenter={center}
        center={center}
        >
            {marks}
            <InfoWindow marker={activeMarker} visible={showInfo} onClose={onClose}>
                <div>
                    <h6>{info.lat + ":" + info.lng}</h6>
                </div>
            </InfoWindow>
        </Map>
      </div>);
});
//>>CLASS:Arquivo
function Arquivo() {
    let { folderId, fileId } = useParams();
    let match = useRouteMatch();
    let url = BucketHost + "/" + folderId + "/" + fileId;
    //>>Arquivo.downloadFile
    function downloadFile() {
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileId;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 5000);
    }
    //>>Arquivo.render
    return (
        <div>
            <div style={{fontSize:"24px"}}>Arquivo : {"/" + folderId + "/" + fileId}</div>
            <MAP1 url={url}/>
            <button type="button" className="btn btn-primary my-1" onClick={downloadFile}>Baixar o arquivo</button>
        </div>
    );
}
//>>CLASS:Arquivos
function Arquivos() {
    
    let match = useRouteMatch();
    //>>Arquivos.render
    return (
        <Switch>
            <Route exact path={`${match.path}/:folderId/:fileId`}>
                <Arquivo/>
            </Route>
        </Switch>
    )
}
//>>CLASS:Historico
function Historico() {
    var [ links, setLinks ] = useState([]);
    var [ loading, setLoading ] = useState(true);
    if(loading) {
        setLoading(false);
        (async ()=>{
            try {
                var req = await fetch("/api/list", {method:"POST"});
                var text = await req.text();
                var json = JSON.parse(text);
                console.log(text,json);
                var _links = [];
                if(json.result) {
                    json.data.sort((a,b)=>{
                        return a > b;
                    });
                    for(var x = 0; x < json.data.length;x++) {
                        _links.push(
                            <div>
                                <Link key={x} to={"/arquivo" + json.data[x]}><button type="button" className="btn btn-primary my-1 mr-1">{json.data[x]}</button></Link>
                            </div>
                        );
                    }
                }
                setLinks(_links);
            } catch(e) {
                console.log(e.message);
            }
        })();
    }
    //>>Historico.render
    return (
        <div>
            <div style={{fontSize:"24px"}} className="title_historico">Histórico:</div>
            {links}
            
        </div>
    )

}
//>>CLASS:App
function App() {
    const history = useHistory();

    var [path,setPath] = useState("/pasta/arquivo1");
    var [errorList,setErrorList] = useState([]);
    //>>App.pathChange
    function pathChange(e) {
        console.log(e.target.value);
        var _errorList = [];
        var arr = e.target.value.split("/");
        if(!(arr.length == 3 && arr[0] == "" && arr[1]!= "" && arr[2] != "")) {
            _errorList.push(
                <div key={0} className="alert alert-danger" role="alert">
                    O caminho deve estar no formato /pasta/arquivo
                </div>
            );
        }
        setErrorList(_errorList);
        setPath(e.target.value);
        return true;
    }
    //>>App.fileChange
    async function fileChange(e) {
        // read file
        if(e.target.files.length>0) {
            var file_info = e.target.files[0];
            let reader = new FileReader();
            reader.onload = async function(e2) {
                var data = e2.target.result;
                var list = csv.toArrays(data);
                // normalize csv
                var retList = [];
                var has_header = false;
                var has_errors = false;
                var errors = [];
                var _errorList = [];
                for(var x = 0; x < list.length;x++) {
                    if( Object.prototype.toString.apply(list[x]) === "[object Array]" && list[x].length === 2) {
                        if(x===0) { // check headers
                            if( Object.prototype.toString.apply( list[x][0] ) !== "[object Number]") {
                                has_header = true;
                            }
                        }
                        if((x===0 && !has_header) || x > 0) {
                            var type_lat = Object.prototype.toString.apply(list[x][0]);
                            var type_lon = Object.prototype.toString.apply(list[x][1]);
                            console.log("linha " + (x+1),list[x]);
                            var mode = -1;
                            var orig_lat = list[x][0];
                            var orig_lon = list[x][1];
                            if(type_lon === "[object String]" && type_lat === "[object String]") {
                                try {
                                    mode = 0;
                                    list[x][0] = parseFloat(list[x][0]);
                                    if(isNaN(list[x][0])) {
                                        mode = 1;
                                        throw new Error("latitude não é um numero válido.");
                                        
                                    }
                                    if(!(list[x][0] >= -90 && list[x][0] <= 90)) {
                                        mode = 2;
                                        throw new Error("latitude não é um numero válido.");
                                        
                                    }
                                    mode = 3;
                                    list[x][1] = parseFloat(list[x][1]);
                                    if(isNaN(list[x][1])) {
                                        mode = 4;
                                        throw new Error("longitude não é um numero válido.");
                                    }
                                    if(!(list[x][1] >= -180 && list[x][1] <= 180)) {
                                        mode = 5;
                                        throw new Error("longitude não é um numero válido.");
                                    }
                                    retList.push(list[x]);
                                } catch(e) {
                                    // error at line x + 1, warn why
                                    has_errors = true;
                                    if(mode === 0 || mode === 1 || mode === 2) {
                                        list[x][0] = orig_lat;
                                        errors.push("latitude da linha " + (x+1) + " não é valida." + JSON.stringify(list[x]));
                                    } else if( mode === 3 || mode === 4 || mode === 5) {
                                        list[x][1] = orig_lon;
                                        errors.push("longitude da linha " + (x+1) + " não é valida." + JSON.stringify(list[x]));
                                    }
                                }
                            }
                        }
                    } else {
                        // csv parser error
                        has_errors = true;
                        if(x===0) { // check header
                            if( Object.prototype.toString.apply( list[x][0] ) !== "[object Number]") {
                                has_header = true;
                            } else {
                                errors.push("linha " + x + " deve possuir apenas latitude e longitude." + JSON.stringify(list[x]));
                            }
                        } else {
                            errors.push("linha " + x + " deve possuir apenas latitude e longitude." + JSON.stringify(list[x]));
                        }
                    }
                }
                if(has_errors) {
                    for(var x1 = 0; x1 < errors.length;x1++) {
                        _errorList.push(<div key={x1} className="alert alert-warning" role="alert">
                            {errors[x1]}
                        </div>);
                    }
                    setErrorList(_errorList);
                } else {
                    // upload file to server
                    console.log("retList",retList);
                    if( Object.prototype.toString.apply(path)!="[object String]" || path.length<=0 || path.length > 255 ) {
                        
                        _errorList.push(<div key={x1} className="alert alert-warning" role="alert">
                            Caminho inválido, máximo de 255 caracteres.
                        </div>);
                        setErrorList(_errorList);
                        return;
                    }
                    if(path.charAt(0)!="/") path = "/" + path;
                    var data = await fetch(RouterHost + "/api/add",{
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        method : "POST",
                        body : JSON.stringify({
                            path : path,
                            file : data
                        })
                    });
                    var result_text = await data.text();
                    console.log("AJAX RESULT:",result_text);
                    try {
                        var json = JSON.parse(result_text);
                        if(!json.result) {
                            for(var x1 = 0; x1 < json.errors.length;x1++) {
                                _errorList.push(<div key={x1} className="alert alert-warning" role="alert">
                                    {json.errors[x1]}
                                </div>);
                            }
                            setErrorList(_errorList);
                            return;
                        }
                    } catch(e) {
                        _errorList.push(<div key={x1} className="alert alert-warning" role="alert">
                            Houve um problema no retorno dos dados.
                        </div>);
                        setErrorList(_errorList);
                        return;
                    }
                    // update view route of file
                    history.push("/arquivo" + path + ".csv");
                }
            };
            reader.readAsText(file_info);
        }
    }
    //>>App.render
    return (
        <div style={{padding:"20px"}}>
            <div style={{display:"flex",padding:"10px"}}>
                <div style={{marginRight:"20px"}}>
                    <div>
                        <Link to="/envio">
                            <button className="btn btn-primary my-1">
                                Envio de arquivos
                            </button>
                        </Link>
                    </div>
                    <div>
                        <Link to="/historico"><button type="button" className="btn btn-primary my-1">Arquivos enviados</button></Link>
                    </div>
                </div>
                <div style={{paddingLeft:"20px",borderLeft:"solid 1px #000"}}>
                    <Switch>
                        <Route path="/envio">
                            <div style={{fontSize:"24px"}} className="title_envio">Envio de arquivo:</div>
                            <br/>
                            <div style={{paddingLeft:"20px"}}>&nbsp;&nbsp;&nbsp;&nbsp;O arquivo deve estar no formato <a href="https://tools.ietf.org/html/rfc4180">CSV</a> contento uma lista de entradas. Cada entrada consiste de latitude e longitude em formato ponto flutuante para graus.</div>
                            <br/>
                            <br/>
                            <div>
                                <div className="input-group mb-3" style={{paddingLeft:"20px"}}>
                                    <div className="input-group-prepend">
                                        <span className="input-group-text" id="basic-addon1">Salvar como:</span>
                                    </div>
                                    <input type="text" className="form-control input_envio1" placeholder="/pasta/arquivo1" onChange={pathChange} aria-label="Username" aria-describedby="basic-addon1" value={path} style={{textAlign:"right"}}/>
                                    <div className="input-group-append">
                                        <span className="input-group-text">.csv</span>
                                    </div>
                                </div>
                                <br/>
                                <div style={{textAlign:"right"}}>
                                    <button className="btn btn-primary my-1" style={{position:"relative"}}>
                                        Enviar arquivo
                                        <input type="file" style={{
                                            position:"absolute",
                                            left:"0px",
                                            top:"0px",
                                            width:"127px",
                                            height:"37px",
                                            opacity:"0.01"
                                        }} onChange={fileChange} className="input_envio2"/>
                                    </button>
                                </div>
                                {errorList}
                            </div>
                        </Route>
                        <Route path="/historico">
                            <Historico/>
                        </Route>
                        <Route path="/arquivo">
                            <Arquivos/>
                            <div>
                                <Link to="/historico"><button type="button" className="btn btn-primary my-1">Voltar</button></Link>
                            </div>
                        </Route>
                    </Switch>
                </div>
            </div>
        </div>
    );
};
//>>CLASS:Main
function Main() { // <Router> must be above component that "useHistory".
    return (
        <Router><App/></Router>
    )
}

export default Main;
