# ep_prometheus_exporter

Setup a Prometheus exporter for Etherpad lite.

You just have to install the plugin and configure your Prometheus server to scrape http://pad.mydomain.org/metrics. Here is an example result :

```
# HELP etherpad_pads_count Number of pads
# TYPE etherpad_pads_count gauge
etherpad_pads_count{instance="etherpad-test"} 6

# HELP etherpad_blank_pads_count Number of blank pads
# TYPE etherpad_blank_pads_count gauge
etherpad_blank_pads_count{instance="etherpad-test"} 2

# HELP etherpad_connected_users_count Number of connected users
# TYPE etherpad_connected_users_count gauge
etherpad_connected_users_count{instance="etherpad-test"} 1
```

You can set some specific values on `settings.json` file :

```json
"ep_prometheus_exporter": {
  "instanceName": "INSTANCE LABEL ON METRICS",
  "updateInterval": 60
}
```
