const fs 			   = require('fs');
const ethUtil  		   = require('ethereumjs-util');
const dockerTemplate   = require("../templates/docker-template");
var genesisTemplate    = require('../templates/genesis-template');
const amount           = "0xfffffffffffffffffffffffffffffffffffff";

//Possible values are "full" to generate yml with quorum-maker and eth-stat
//And "single" mode to generate yml without these two containers
var modeFlag = "addon";
readInitialParams();

var input   		   = require('./getMnemonics');
var mnemonic 		   = input.template;

var privateKeyJSON = {}; var writeprivatekeys = true;
var privateKeys = [], publicKeys = [], static_nodes = "[", extraData, enodes = [];
const vanity = mnemonic.istanbul.vanity || "0x0000000000000000000000000000000000000000000000000000000000000000";
const seal   = mnemonic.istanbul.seal || "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

function readInitialParams(){
    var initialParamFileName = __dirname + "/../initialparams.json";
    if(fs.existsSync(initialParamFileName)){
        var initialDataRaw = fs.readFileSync(initialParamFileName,"utf8");
		var initialData = JSON.parse(initialDataRaw);
		if(initialData["mode"] != undefined)
			modeFlag = initialData["mode"];
        console.log("modeFlag is", modeFlag);
    }
    else{
        console.log("initialparams.json file does not exist! The program may not function properly!");
    }    
}

if(mnemonic.mode == 0){
	var temp = mnemonic.mnemonic;
	for (var i = 0; i < temp.length; i++) {
		privateKeys.push('0x'+ethUtil.keccak(temp[i]).toString('hex'));
	}
}else {
	privateKeys = mnemonic.keys;
}

var baseIp = dockerTemplate.serviceConfig.validator.startIp.split(".");
const startIp = (parseInt(baseIp[3]));
baseIp = baseIp[0]+"."+baseIp[1]+"."+baseIp[2]+".";
for (var i = 0; i < privateKeys.length; i++) {
	var temp = ethUtil.privateToPublic(privateKeys[i]).toString('hex');
	enodes.push(temp);
	static_nodes += (
		"\"enode://"+temp+
		"@"+
		baseIp+
		(startIp+i)+
		":"+
		dockerTemplate.serviceConfig.validator.gossipPort+
		"?discport=0\""
	);
	let pubk = ethUtil.privateToAddress(privateKeys[i]).toString('hex');
	privateKeyJSON["0x" + pubk] = privateKeys[i].split("0x")[1];
	publicKeys.push(pubk);
	if(i != privateKeys.length-1){
		static_nodes+=",";
	}else{
		static_nodes+="]";
	}
}

temp = [];
var data = [];
genesisTemplate['coinbase'] = "0x0000000000000000000000000000000000000000";
for (var i = 0; i < publicKeys.length; i++) {
	genesisTemplate['alloc'][publicKeys[i]] = { "balance" : amount };
	temp.push(Buffer.from(publicKeys[i],'hex'));
}
data.push(temp);
temp = seal.split('0x');
if(temp.length == 1)
	throw "Make sure all hex values start from 0x";
data.push(Buffer.from(temp[1],"hex"));
data.push([]);

genesisTemplate['extraData'] = vanity+ethUtil.rlp.encode(data).toString("hex");

const tempDir = "./output/tmp/";
if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
}

if(modeFlag == "full"){
	fs.writeFileSync(tempDir+"genesis.json",JSON.stringify(genesisTemplate));
	fs.writeFileSync(tempDir+"static-nodes.json",static_nodes);
//	fs.writeFileSync(tempDir+"permissioned-nodes.json",static_nodes);
}

if(writeprivatekeys){
	var data = JSON.stringify(privateKeyJSON,null, 2);
	fs.writeFileSync(tempDir+"privatekeys.json",data);
}

exports.publicKeys    = publicKeys;
exports.privateKeys   = privateKeys;
exports.staticNodes   = static_nodes;
exports.genesisString = JSON.stringify(genesisTemplate);
exports.passwords     = input.passwords;
exports.enodes        = enodes;
exports.modeFlag	  = modeFlag;
