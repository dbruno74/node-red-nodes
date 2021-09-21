
module.exports = function(RED) {
    "use strict";
    var SensorTag = require("@dbruno74/sensortag");

    function SensorTagNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.topic = n.topic;
        this.uuid = n.uuid;
        this.temperature = n.temperature;
        this.pressure = n.pressure;
        this.humidity = n.humidity;
        this.accelerometer = n.accelerometer;
        this.magnetometer = n.magnetometer;
        this.gyroscope = n.gyroscope;
        this.luxometer = n.luxometer;
        this.keys = n.keys;
	this.button = n.button;
	this.battery = n.battery;
        if (this.uuid === "") { this.uuid = undefined; }
        var node = this;
        node.discovering = false;

        if (typeof node.stag === "undefined") {
            node.loop = setInterval(function() {
                if (!node.discovering) {
                    node.status({fill:"blue", shape:"dot", text:"discovering..."});
                    node.discovering = true;
                    SensorTag.discover(function(sensorTag) {
                        node.status({fill:"blue", shape:"dot", text:"connecting"});
                        node.stag = sensorTag;
                        node.log("found sensor tag: " + sensorTag._peripheral.uuid);
			node.warn("found sensor tag: " + sensorTag._peripheral.uuid);
			node.warn("sensortag type: " + node.stag.type);
                        node.topic = node.topic || sensorTag._peripheral.uuid;
                        sensorTag.connect(function() {
                            node.log("connected to sensor tag: " + sensorTag._peripheral.uuid);
                            node.warn("connected to sensor tag: " + sensorTag._peripheral.uuid);
                            node.status({fill:"green", shape:"dot", text:"connected"});

                            sensorTag.once('disconnect', function() {
                                node.discovering = false;
                                node.status({fill:"red", shape:"ring", text:"disconnected"});
                                node.log("disconnected ",node.uuid);
                                node.warn("disconnected ",node.uuid);
                            });

                            sensorTag.discoverServicesAndCharacteristics(function() {
                                sensorTag.enableIrTemperature(function() {});
                                sensorTag.on('irTemperatureChange',
                                function(objectTemperature, ambientTemperature) {
                                    var msg = {'topic': node.topic + '/temperature'};
                                    msg.payload = {'object': +objectTemperature.toFixed(1),
                                    'ambient': +ambientTemperature.toFixed(1)
                                    };
                                    node.send(msg);
                                });
                                if (node.stag.type != "cc1352") {
				   sensorTag.enableBarometricPressure(function() {});
                                   sensorTag.on('barometricPressureChange', function(pressure) {
                                      var msg = {'topic': node.topic + '/pressure'};
                                      msg.payload = {'pressure': parseInt(pressure)};
                                       node.send(msg);
                                   }); 
				}
                                sensorTag.enableHumidity(function() {});
                                sensorTag.on('humidityChange', function(temp, humidity) {
                                    var msg = {'topic': node.topic + '/humidity'};
                                    msg.payload = {'temperature': +temp.toFixed(1),
                                    'humidity': +humidity.toFixed(1)
                                    };
                                    if ((temp !== -40) || (humidity !== 100)) {
                                        node.send(msg);
                                    }
                                });
                                if (node.stag.type === "cc1352") {
				    sensorTag.enableAccelerometer(function() {});
                                    sensorTag.on('accelerometer_xChange', function(x) {
                                        var msg = {'topic': node.topic + '/accelerometer'};
                                        msg.payload = {'axis': 'x', 'coord': +x.toFixed(2)};
                                        node.send(msg);
                                    });
                                    sensorTag.on('accelerometer_yChange', function(y) {
                                        var msg = {'topic': node.topic + '/accelerometer'};
                                        msg.payload = {'axis': 'y', 'coord': +y.toFixed(2)};
                                        node.send(msg);
                                    });
                                    sensorTag.on('accelerometer_zChange', function(z) {
                                        var msg = {'topic': node.topic + '/accelerometer'};
                                        msg.payload = {'axis': 'z', 'coord': +z.toFixed(2)};
                                        node.send(msg);
                                    });
				} else {
                                    sensorTag.enableAccelerometer(function() {});
                                    sensorTag.on('accelerometerChange', function(x,y,z) {
                                        var msg = {'topic': node.topic + '/accelerometer'};
                                        msg.payload = {'x': +x.toFixed(2), 'y': +y.toFixed(2), 'z': +z.toFixed(2)};
                                        node.send(msg);
                                    });
				}
                                if (node.stag.type != "cc1352") {
			            sensorTag.enableMagnetometer(function() {});
                                    sensorTag.on('magnetometerChange', function(x,y,z) {
                                        var msg = {'topic': node.topic + '/magnetometer'};
                                        msg.payload = {'x': +x.toFixed(2), 'y': +y.toFixed(2), 'z': +z.toFixed(2)};
                                        node.send(msg);
                                    });
                                    sensorTag.enableGyroscope(function() {});
                                    sensorTag.on('gyroscopeChange', function(x,y,z) {
                                        var msg = {'topic': node.topic + '/gyroscope'};
                                        msg.payload = {'x': +x.toFixed(2), 'y': +y.toFixed(2), 'z': +z.toFixed(2)};
                                        node.send(msg);
                                    });
				}
                                if (node.stag.type === "cc1352") {
				    sensorTag.on('button_0Change', function(key,event) {
                                        var msg = {'topic': node.topic + '/button'};
                                        msg.payload = {'key': key, 'event': event};
                                        node.send(msg);
                                    });
				    sensorTag.on('button_1Change', function(key,event) {
                                        var msg = {'topic': node.topic + '/button'};
                                        msg.payload = {'key': key, 'event': event};
                                        node.send(msg);
                                    });
				} else {
                                    sensorTag.on('simpleKeyChange', function(left, right, mag) {
                                        var msg = {'topic': node.topic + '/keys'};
                                        msg.payload = {'left': left, 'right': right, 'magnet': mag};
                                        node.send(msg);
                                    });
				}
                                sensorTag.on('luxometerChange', function(lux) {
                                    var msg = {'topic': node.topic + '/luxometer'};
                                    msg.payload = {'lux': parseInt(lux)};
                                    node.send(msg);
                                });
                                sensorTag.on('batteryLevelChange', function(val) {
                                    var msg = {'topic': node.topic + '/batteryLevel'};
                                    msg.payload = {'val': parseInt(val)};
                                    node.send(msg);
                                });
                                enable(node);
                            });
                        });
                    },node.uuid);
                }
            },15000);
        }
        else {
            console.log("reconfig",node.uuid);
            enable(node);
        }

        this.on("close", function() {
            if (node.loop) { clearInterval(node.loop); }
            if (node.stag) { node.stag.disconnect(function() {}); }
        });

	this.on("input", function(msg) {
	    if (msg.topic === "writeLed") {
              node.stag.writeLed(msg.payload.ledNum, msg.payload.val);
	    }		
	});
    }

    var enable = function(node) {
        if (node.temperature) {
            node.stag.notifyIrTemperature(function() {});
        }
        else {
            node.stag.unnotifyIrTemperature(function() {});
        }
        if (node.stag.type != "cc1352") {
            if (node.pressure) {
                node.stag.notifyBarometricPressure(function() {});
            }
            else {
                node.stag.unnotifyBarometricPressure(function() {});
            }
	}
        if (node.humidity) {
            node.stag.notifyHumidity(function() {});
        }
        else {
            node.stag.unnotifyHumidity(function() {});
        }
        if (node.accelerometer) {
            node.stag.notifyAccelerometer(function() {});
        }
        else {
            node.stag.unnotifyAccelerometer(function() {});
        }
        if (node.stag.type != "cc1352") {
	    if (node.magnetometer) {
                node.stag.notifyMagnetometer(function() {});
            }
            else {
                node.stag.unnotifyMagnetometer(function() {});
            }
            if (node.gyroscope) {
                node.stag.notifyGyroscope(function() {});
            }
            else {
                node.stag.unnotifyGyroscope(function() {});
            }
	}
        if (node.stag.type === "cc2650" || node.stag.type === "cc1352") {
            if (node.luxometer) {
                node.stag.enableLuxometer(function() {});
                node.stag.notifyLuxometer(function() {});
            }
            else {
                node.stag.unnotifyLuxometer(function() {});
                node.stag.disableLuxometer(function() {});
            }
        }
        if (node.stag.type === "cc1352") {
            if (node.button) {
                node.stag.notifyButton(function() {});
            }
            else {
                node.stag.unnotifyButton(function() {});
            }
        } else {
            if (node.keys) {
                node.stag.notifySimpleKey(function() {});
            }
            else {
                node.stag.unnotifySimpleKey(function() {});
            }
	}
        if (node.battery) {
            node.stag.notifyBatteryLevel(function() {});
        }
        else {
            node.stag.unnotifyBatteryLevel(function() {});
        }
    }

    RED.nodes.registerType("sensorTag",SensorTagNode);
}
