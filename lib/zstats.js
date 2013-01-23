var fs = require("fs");
var Zabbix = require('zabbix');
var Hosts = require("./hosts.js");

var ZStats = function (configFile, callback) {
    this.configFile = configFile;
    this.config = {};
    this.hosts = new Hosts();
    this.itemIds = [];
    this.data = {};
    this.connection = null;

    this._callback = callback;

    this.interval = false;

    this.loadConfig();
};

ZStats.prototype.createInterval = function() {
    var self = this;
    if(!this.interval) {
        this.interval = setInterval(function() {
            self.getLastValues();
        }, 1000);
    }
};

ZStats.prototype.loadConfig = function () {
    var config_str = fs.readFileSync(this.configFile, "utf8");
    this.config = JSON.parse(config_str);

    this.connect();
};

ZStats.prototype.connect = function () {
    this.connection = new Zabbix(this.config.host, this.config.username, this.config.password);
    var self = this;
    this.connection.authenticate(function (err, resp, body) {
        if( !err ) {
            console.log("Authenticated! AuthID is: " + self.connection.authid);
            self.hosts.load(self.connection, function () {
                self.getHostIds();
            });
        }
    });
};

ZStats.prototype.getHostIds = function () {
    var self = this;
    this.config.data.forEach(function (data) {
        data.hostIds = [];
        data.hosts.forEach(function (hostName) {
            var host = self.hosts.getHostByName(hostName);
            host.options = data.options;
            data.hostIds.push(host.hostid);
        });
    });

    this.getItemIds();
};

ZStats.prototype.getItemIds = function () {
    var self = this;

    this.config.data.forEach(function (data) {
        data.itemIds = [];
        self.connection.call("item.get",
            {
                "hostids": data.hostIds,
                "search": {"key_": data.key},
                "output": "extend",
                "searchWildcardsEnabled": 1
            }
            , function (err, resp, body) {
                if( !err ) {
                    body.result.forEach(function (item) {
                        var host = self.hosts.getHostById(item.hostid);

                        self.itemIds.push(item.itemid);
                        self.data[item.itemid] = {
                            hostId: item.hostid,
                            itemId: item.itemid,
                            name: item.name,
                            hostName: host.name,
                            options: host.options,
                            key: item.key_,
                            value: item.lastvalue,
                            lastCheck: item.lastclock,
                            prevValue: item.prevvalue,
                            valueType: item.value_type
                        };

                    });

                    self.getLastValues();
                }
            }
        );
    })
};

ZStats.prototype.getLastValues = function () {
    var self = this;

    this.connection.call("item.get",
        {
            "output": "extend",
            "itemids": this.itemIds
        }, function (err, resp, body) {
            if( !err ) {
                body.result.forEach(function (item) {
                    var data = self.data[item.itemid];
                    data.value = item.lastvalue;
                    data.prevValue = item.prevvalue;
                    data.lastCheck = item.lastclock;
                });

                self.createInterval();
                self._callback(self.data);
            }
        });
};

module.exports = ZStats;
