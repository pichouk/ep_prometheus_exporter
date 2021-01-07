const epAPI = require("ep_etherpad-lite/node/db/API");

// Load settings
const epSettings = require("ep_etherpad-lite/node/utils/Settings");
const settings = epSettings.ep_prometheus_exporter
  ? epSettings.ep_prometheus_exporter
  : {};

// Metrics
var metrics = {
  padsCount: 0,
  blankPadsCount: 0,
  connectedUsers: 0,
};
var blankPads = {};

// Update all metrics
async function updateMetrics() {
  // Count all pads
  epAPI.listAllPads().then((padsList) => {
    metrics.padsCount = padsList.padIDs.length;
  });

  // Get number of blank pads
  metrics.blankPadsCount = Object.keys(blankPads).length;

  // Get Etherpad stats
  const epStats = require("ep_etherpad-lite/node/stats").toJSON();

  // Update connected users
  metrics.connectedUsers = epStats.totalUsers;
}

// When a new pad is created
exports.padCreate = (hook_name, context) => {
  // Update the blank pad list
  if (context.pad.head === 0) {
    blankPads[context.pad.id] = 1;
  } else {
    if (blankPads[context.pad.id] !== undefined) {
      delete blankPads[context.pad.id];
    }
  }
  // Update all metrics
  updateMetrics();
};

// When a pad is loaded (opened)
exports.padLoad = (hook_name, context) => {
  // Update blank pad list
  if (context.pad.head === 0) {
    blankPads[context.pad.id] = 1;
  } else {
    if (blankPads[context.pad.id] !== undefined) {
      delete blankPads[context.pad.id];
    }
  }
  metrics.blankPadsCount = Object.keys(blankPads).length;
};

// When a pad is updated
exports.padUpdate = (hook_name, context) => {
  // Update blank pad list
  if (context.pad.head === 0) {
    blankPads[context.pad.id] = 1;
  } else {
    if (blankPads[context.pad.id] !== undefined) {
      delete blankPads[context.pad.id];
    }
  }
  metrics.blankPadsCount = Object.keys(blankPads).length;
};

// When a pad is removed
exports.padRemove = (hook_name, context) => {
  // Update blank pad list
  var padId = context.padID;
  if (blankPads[padId] !== undefined) {
    delete blankPads[padId];
  }
  // Update metrics
  updateMetrics();
};

// When Etherpad server is started
exports.expressCreateServer = (hook_name, args, callback) => {
  // Get instance name
  const instanceName =
    settings.instanceName !== undefined ? settings.instanceName : "etherpad";

  // Add custom views folder
  const currentViews = args.app.get("views");
  if (typeof currentViews == "object") {
    args.app.set("views", [...currentViews, __dirname + "/views"]);
  } else {
    args.app.set("views", [currentViews, __dirname + "/views"]);
  }

  // Expose metrics
  args.app.get("/metrics", function (req, res) {
    res.setHeader("Content-Type", "text/plain");
    res.render("metrics.ejs", {
      instanceName: instanceName,
      metrics: metrics,
    });
  });

  // Initialize blank pad count
  epAPI.listAllPads().then((padsList) => {
    padsList.padIDs.forEach((padID) => {
      if (epAPI.getRevisionsCount(padID).revisions <= 1) {
        blankPads[padID] = 1;
      }
    });
  });

  // Initialize metrics
  updateMetrics();

  return callback();
};

const updateInterval =
  settings.updateInterval !== undefined ? settings.updateInterval : 60;
setInterval(updateMetrics, updateInterval * 1000);
