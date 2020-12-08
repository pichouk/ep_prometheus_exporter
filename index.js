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
  const padsList = await epAPI.listAllPads();
  metrics.padsCount = padsList.padIDs.length;

  // Get number of blank pads
  metrics.blankPadsCount = Object.keys(blankPads).length;

  // Get Etherpad stats
  const epStats = require("ep_etherpad-lite/node/stats").toJSON();

  // Update connected users
  metrics.connectedUsers = epStats.totalUsers;
}

// Update the blank pads list based on a pad event
async function updateBlankPads(pad) {
  if (pad.head === 0) {
    blankPads[pad.id] = 1;
  } else {
    if (blankPads[pad.id] !== undefined) {
      delete blankPads[pad.id];
    }
  }
}

// When a new pad is created
exports.padCreate = async (hook_name, context) => {
  // Update the blank pad list
  await updateBlankPads(context.pad);
  // Update all metrics
  updateMetrics();
};

// When a pad is loaded (opened)
exports.padLoad = async (hook_name, context) => {
  // Update blank pad list
  await updateBlankPads(context.pad);
  metrics.blankPadsCount = Object.keys(blankPads).length;
};

// When a pad is updated
exports.padUpdate = async (hook_name, context) => {
  // Update blank pad list
  await updateBlankPads(context.pad);
  metrics.blankPadsCount = Object.keys(blankPads).length;
};

// When a pad is removed
exports.padRemove = async (hook_name, context) => {
  // Update blank pad list
  var padId = context.padID;
  if (blankPads[padId] !== undefined) {
    delete blankPads[padId];
  }
  // Update metrics
  updateMetrics();
};

// When Etherpad server is started
exports.expressCreateServer = async (hook_name, args) => {
  // Initialize metrics
  await updateMetrics();
  // Initialize blank pad count
  const padsList = await epAPI.listAllPads();
  padsList.padIDs.forEach(async (padID) => {
    if ((await epAPI.getRevisionsCount(padID)).revisions <= 1) {
      blankPads[padID] = 1;
    }
  });

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
    res.render("metrics.ejs", {
      instanceName: instanceName,
      metrics: metrics,
    });
  });
};

const updateInterval =
  settings.updateInterval !== undefined ? settings.updateInterval : 60;
setInterval(updateMetrics, updateInterval * 1000);
