var powerSwitch = require("pi-pins").connect(22);
var log = require('simple-node-logger').createSimpleLogger('restart.log');

log.info('Initializing');

powerSwitch.mode('out');
powerSwitch.value(false);

function cyclePower(powerOffDuration) {
  powerSwitch.value(true);
  log.info('Power is now off');

  setTimeout(function () {
    powerSwitch.value(false);
    log.info('Power is back on');
  },powerOffDuration);
}

cyclePower(10);
