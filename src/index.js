var isOnline = require("is-online")
var offline = 0;
var powerSwitch = require("pi-pins").connect(22);
var moment = require("moment-timezone");
var timr = require("timr");
var rest = require("rest");
var fs = require('fs');
var scheduler = timr();
var backlog = [];
var dweetClient = require("node-dweetio");
var dweetio = new dweetClient();
var log = require('simple-node-logger').createSimpleLogger('logger.log');

log.info('Initializing');
// Initialize the powerSwitch 
powerSwitch.mode('out');
powerSwitch.value(false);

try {
  var conf = JSON.parse(fs.readFileSync('./conf.json', 'utf8'));
  //const API_KEY = conf.apiKey;
  const PING_INTERVAL = conf.checkFrequencySeconds;
  const PUSH_FREQ = conf.publishFrequencySeconds;
  const OFFLINE_MAX = conf.maxOfflineIntervals;
} catch(e) {
  console.log("Please copy the file conf.json.default to conf.json. Place your thingspeak.com API key in the appropriate location within the file.");
  process.exit();
}

const API_KEY = process.env.THINGSPEAK_ICM_API_KEY || function() { console.log("Please defined the THINGSPEAK_ICM_API_KEY evnironmant variable"); process.exit(); } 

console.log("Starting internet connection monitor.\nChecking every " + PING_INTERVAL + " seconds.\nUploading that data to thingspeak.com every " + PUSH_FREQ + " seconds.");

const URL = 'https://api.thingspeak.com/update?api_key={apikey}&created_at={stamp}&field1={isOnline}'

var ping = function() {isOnline(function(err, online) {
    var check = {stamp: moment().tz('GMT').format(), online:online};
    backlog.push(check);
    if(online && backlog.length >= (PUSH_FREQ/PING_INTERVAL)) {
        while(event = backlog.shift()) {
            pushToAPI(event.stamp, event.online);
        }
    }

    // Count the number of consecutive intervals we're offline and
    // cycle the power if we've been offline for too many consecutive
    // intervals
    if(!online) {
      offline++;
      log.info('Offline for ' + offline + ' consecutive intervals.');
      if(offline > offlineMax) {
        log.info('Internet is down ... cycling power switch ...');
        cyclePower(10000);
      }
    } else {
      offline = 0;
    }

})};

function cyclePower(cycletime) {
  powerSwitch.value(true);
  log.info('Power is now off');
  setTimeout(function () {
    powerSwitch.value(false);
    log.info('Power is back on');
  },cycletime);
}

function pushToAPI(stamp, status) {
    var api = URL
      .replace('{isOnline}', status+0)
      .replace('{stamp}', encodeURIComponent(stamp))
      .replace('{apikey}', API_KEY);
    rest(api)
    .then(o => {
      if(o.status == 400) {
        "Recieved a 400 error from the server. Check your thingspeak.com API key in conf.json";
      }
      console.log(stamp,status?'Online':'Offline',o.status);
    });
    
      //dweetio.dweet_for("10-ealing-internet-connection", {isOnline:status+0}, function(err, dweet){
      //console.log(dweet.thing); // "my-thing"
      //console.log(dweet.content); // The content of the dweet
      //console.log(dweet.created); // The create date of the dweet

    //});
}

scheduler().every(PING_INTERVAL).seconds().run(ping);
