const exec = require('child_process').exec;
const txt1 = "Maybe you meant:";
const txt2 = "To search the help text of gcloud commands, run";
var http = require("http");

runCommand('gcloud compute help');
runCommand('gcloud projects help');
runCommand('gcloud iam l');

var listOfCommands = {};

function trimLast(cmnd) {
    var cmndSplit = cmnd.split(" ");
    var strr = "";
    for(var i=0;i<cmndSplit.length-1;i++) {
        strr+=cmndSplit[i]+" ";
    }
    return strr.trim();
}

function getTotalCommands() {
    var size=0;
    for(k in listOfCommands) {
        size++;
    }
    return size;
}

function runCommand(cmnd) {
    exec(cmnd, (err, stdout, stderr) => {
        console.log("Running "+cmnd);
        if (err) {
            //console.error(err);  
            var d = String(err);
            if (d.indexOf(txt1) > -1 && d.indexOf(txt2) > -1) {
                var data = d.substring(d.indexOf(txt1) + txt1.length, d.indexOf(txt2));
                data = convertToArray(data);
                listOfCommands[trimLast(cmnd)] = data;
                console.log(data);
                console.log(listOfCommands);
                return;
            } else {
                console.log("----\n" + d + "\n----");
            }
        }
        var d = String(stdout);
        if (d.indexOf(txt1) > -1 && d.indexOf(txt2) > -1) {
            var data = d.substring(d.indexOf(txt1) + txt1.length, d.indexOf(txt2));
            data = convertToArray(data);
            listOfCommands[trimLast(cmnd)] = data;
            console.log(data);
        } else {
            console.log("----\n" + d + "\n----");
        }
    });
}

function convertToArray(data) {
    var dataSplit = data.split("\n");
    var arr = [];
    for(let indx in dataSplit) {
        var d = dataSplit[indx].trim();
        if(d!="") {
            arr.push(d);
        }
    }
    return arr;
}

var server = http.createServer(serverFunction);

function serverFunction(req,res) {
    if(req.url=="/") {
        res.writeHead(200,{'Content-Type':'text/html'});
        var css = createCss();
        var html = "<table>";
        html += "<tr><td rowspan='"+(getTotalCommands()*3+1)+"'><textarea id='cmndOut' readonly></textarea></td><td colspan='2'>GUI for GCP CLI</td></tr>";
        for(k in listOfCommands) {
            html += "<tr><td colspan='2'><h1>"+k+"</h1></td></tr>";
            html += "<tr>";
            var cmnd = listOfCommands[k];
            var  id = (k.split(" ").join("_")).trim();
            html+="<td colspan='2'><select id='"+id+"'>";
            for(indx in cmnd) {
                html+="<option>"+cmnd[indx]+"</option>";
            }
            html+="</select></td></tr><tr>";
            html+="<td><input type='text' placeholder='Additional Arguments' class='additionalArgs' id='additionalArgs_"+id+"'></td>";
            html+="<td><input type='button' value='Run' onclick='runCommand(\""+id+"\")'></td>";
            html += "</tr>";
        }
        html+="</table>";
        var script = createScript();
        res.end(css+html+script);
    } else if(req.url.indexOf("/callCmnd_")==0) {
        var callCmnd_ = req.url.replace("/callCmnd_","");
        if(callCmnd_.indexOf("%20")>-1) {
            callCmnd_ = callCmnd_.split("%20").join(" ");
        }
        console.log("Going to run "+callCmnd_);
        exec(callCmnd_, (err, stdout, stderr) => {
            console.log("Ran "+callCmnd_);
            if (err) {
                try {
                    res.end(err);
                } catch(e) {
                    try {
                        res.end(JSON.stringify(err));
                    } catch(e2) {
                        res.end("Error occured while running "+callCmnd_);
                    }
                }
            } else {
                res.end(stdout);
            }
        });
    } else {
        res.end("Invalid path");
    }
}

var PORT = 8080;

server.listen(PORT,()=>{
    console.log(`Started listening on PORT ${PORT}`);
});

function createScript() {
    var script = `
     <script>
      function runCommand(id) {
        var obj = document.querySelector('#'+id);
        var additionalArgs = document.querySelector('#additionalArgs_'+id);
        var cmndOut = document.querySelector('#cmndOut');
        var cmd = obj.value;
        if(additionalArgs.value.trim()!="") {
            cmd+=" " + additionalArgs.value.trim();
        }
        runCmdInner(cmd);
      }
      var cmd_history = {};
      function runCmdInner(cmd) {
        fetch('callCmnd_'+cmd)
          .then(function(response) {
            return response.text()
          })
          .then(function(txt) {
            txt = txt.split("\\n").join("\\r\\n");
            txt = txt.split("- ").join("\\r\\n- ");
            cmd_history[cmd] = txt;
            cmndOut.innerText = txt;
          })
    .catch(function(err) {  
        console.log('Failed to fetch page: ', err);  
    });
      }
      </script>
    `;
    return script;
}


function createCss() {
    var css = `
    <head>
    <style>
    textarea{
        width:600px;
        height:400px;
    }
    table{
        border-collapse:collapse;
        margin-left:auto;
        margin-right:auto;
    }
    table td{
        border:1px solid blue;
    }
    .additionalArgs{
        background-color:khaki;
        color:blue;
    }
    select{
        width:300px;
    }
    input[type='text'] {
        width:230px;
    }
    input,select{
        height:25px;
    }
    </style>
    </head>
    `;
    return css;
}
