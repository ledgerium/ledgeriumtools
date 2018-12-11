const gethCom = "geth --rpc --rpcaddr '0.0.0.0' --rpcport '8545' --rpccorsdomain '*' \
--datadir '/eth' --rpcapi 'db,eth,net,web3,istanbul,personal,admin,debug,txpool' \
--ws --wsorigins '*' --wsport '9000' --wsapi 'db,eth,net,web3,personal,admin,debug,txpool' \
--wsaddr '0.0.0.0' --networkid 2018 --targetgaslimit 9007199254740000 --permissioned \
--debug --metrics --syncmode 'full' --gasprice 0 --mine --verbosity 3 --nodiscover \
--emitcheckpoints --istanbul.blockperiod 1 --mine --minerthreads 1 --syncmode full";

const constellationCom = "constellation-node --socket=/constellation/tm.ipc --publickeys=/constellation/tm.pub \
--privatekeys=/constellation/tm.key --storage=/constellation --verbosity=4";

const tesseraCom = "";

const services = {
	"eth-stats":{
		"image"        :  "quay.io/amis/ethstats:latest",
		"ports"        :  ["3000:3000"],
		"environment"  :  ["WS_SECRET=bb98a0b6442386d0cdf8a31b267892c1"],
		"restart"	   : "always",
		"networks"	   : {
			"test_net"  : {
				"ipv4_address" : "172.16.239.9"
			}
		}
	},
	"validator": ()=>{
		return {
			"hostname"   : 'validator-',
			"image"		 :	"quorumengineering/quorum:latest",
			"ports"	     : [],
			"volumes"    : [],
			"depends_on" : ["constellation-"],
			"environment":	["PRIVATE_CONFIG=/constellation/tm.conf"],
			"entrypoint" : ["/bin/sh","-c"],
			"networks"	:	{
				"test_net"	:	{
					"ipv4_address"	: ""
				}
			},
			"restart"	: "always"
		}
	},
	"constellation": ()=>{
		return {
			"hostname"   : "constellation-",
			"image"		: "quorumengineering/constellation:latest",
			"ports"	     : [],
			"volumes"    : [],
			"entrypoint" : ["/bin/sh","-c"],
			"networks"	: {
				"test_net"  : {
					"ipv4_address" : ""
				}
			},
			"restart"	: "always"	
		}
	},
	"tessera": ()=>{
		return {
			"hostname"   : "tessera",
			"image"		: "quorumengineering/tessera:latest",
			"ports"	     : [],
			"volumes"    : [],
			"entrypoint" : ["/bin/sh","-c"],
			"networks"	: {
				"test_net"  : {
					"ipv4_address" : ""
				}
			},
			"restart"	: "always"	
		}
	},
	"networks" : {
		"test_net":{
			"driver" : "bridge",
			"ipam"   : {
				"driver"  :  "default",
				"config"  : [ 
					{
						"subnet" : "172.16.239.0/24"
					}
				]
			}
		}
	},
	"tesseraTemplate": ()=>{
		return {
			"useWhiteList"  : false,
			"jdbc"          : {
				"username"		   : "sa",
			    "password"		   : "",
			    "url"     		   : "jdbc:h2:.//priv/db;MODE=Oracle;TRACE_LEVEL_SYSTEM_OUT=0",
                "autoCreateTables" : true
			},
			"server"        : {
				"port"     : "",
				"hostName" : "",
				"sslConfig": {
					"tls"                         : "OFF",
					"generateKeyStoreIfNotExisted": true,
					"serverKeyStore"              : "/priv/server-keystore",
					"serverKeyStorePassword"      : "quorum",
					"serverTrustStore"            : "/priv/server-truststore",
					"serverTrustStorePassword"    : "quorum",
					"serverTrustMode"             : "TOFU",
					"knownClientsFile"            : "/priv/knownClients",
					"clientKeyStore"              : "/priv/client-keystore",
					"clientKeyStorePassword"  	  : "quorum",
					"clientTrustStore"            : "/priv/client-truststore",
					"clientTrustStorePassword"	  : "quorum",
					"clientTrustMode"             : "TOFU",
					"knownServersFile"            : "/priv/knownServers"
				}
			},
			"peer"          : [],
			"keys"          : {
				"passwords": [],
				"keyData"  : [
				    {
					    "privateKeyPath"   : "/priv/tm.key",
						"publicKeyPath": "/priv/tm.pub"
					}
				]
			},
			"alwaysSendTo"  : [],
			"unixSocketFile": "/priv/tm.ipc"/*,
			"disablePeerDiscovery": true*/
		}	
	}
};

const serviceConfig = {
	"validator":{
		"startIp":"172.16.239.10",
		"gossipPort":21000,
		"rpcPort":8545,
		"wsPort":9000
	},
	"constellation":{
		"startIp":"172.16.239.100",
		"port":10000
	},
	"tessera":{
		"startIp":"172.16.239.100",
		"port":10000
	}
};

const template = {	
	"version":"3",
	"services": {

	}
};

exports.template 				= template;
exports.services 				= services;
exports.serviceConfig			= serviceConfig;
exports.genValidatorCommand     = (i, gossipPort,genesisString,staticNodes,privateKeys,publicKeys)=>{
	const commands = [
		//"if [ ! -e \"/eth/genesis.json\" ]; then",
		"rm -f /eth/geth.ipc",
		"mkdir -p /eth",
		"echo '"+genesisString+"' > /eth/genesis.json",
		"echo '"+staticNodes+"' > /eth/static-nodes.json",
		"echo '"+staticNodes+"' > /eth/permissioned-nodes.json",
		"geth init /eth/genesis.json --datadir /eth",		
		//"fi",		
		"echo 'password' > ./password",
		"echo '"+privateKeys.split("0x")[1]+"' > ./file",
		"geth account import file --datadir /eth --password password",
		"rm -f ./file && rm -f ./password",
		gethCom+" --identity "+"\"validator-"+i+"\" --nodekeyhex \""+privateKeys.split("0x")[1]+"\" "+"--etherbase \""+publicKeys+"\" --port \""+gossipPort+"\""
	];
	var commandString = "";
	for (var j = 0; j < commands.length; j++) {
		commandString+=commands[j]+"\n";
	}
	return commandString;
};
exports.genConstellationCommand = (i,othernodes,ip,port)=>{
	const commands = [
		"rm -f /constellation/tm.ipc",
		"if [ -d \"constellation\" ]; then",
		"mkdir -p /constellation",
		"echo \"socket=\\"+"\"/constellation/tm.ipc\\"+"\"\\npublickeys=[\\"+"\"/constellation/tm.pub\\"+"\"]\\n\" > /constellation/tm.conf",
		"constellation-node --generatekeys=/constellation/tm",
		"cp /constellation/tm.pub /tmp/tm"+i+".pub",
		"fi",
		constellationCom+othernodes+" --url=http://"+ip+":"+port+"/ --port="+port
	];
	var commandString = "";
	for (var j = 0; j < commands.length; j++) {
		commandString+=commands[j]+"\n";
	}
	return commandString;
};
exports.genTesseraCommand = (i, template)=>{
	const dir = "/priv";
	const commands = [
		"rm -f "+dir+"/tm.ipc",
		"if [ ! -e \""+dir+"/tm.key\" ]; then",
		"mkdir -p "+dir,
		"echo -e \"\\n\" | java -jar /tessera/tessera-app.jar -keygen -filename "+dir+"/tm",
		"echo '"+JSON.stringify(template)+"' > "+dir+"/tessera-config.json",
		"cp "+dir+"/tm.pub /tmp/tm"+i+".pub",
		"fi",
		"java -Xms128M -Xmx128M -jar /tessera/tessera-app.jar -configfile "+dir+"/tessera-config.json"
	];
	var commandString = "";
	for (var j = 0; j < commands.length; j++) {
		commandString+=commands[j]+"\n";
	}
	return commandString;
}
exports.geth = gethCom;
exports.constellation = constellationCom;
exports.tesseraFlag = true;