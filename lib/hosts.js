var Hosts = function () {
    this.hosts = [];
    this.idToHost = {};
    this.nameToHost = {};
};

Hosts.prototype.load = function (zabbix, callback) {
    var self = this;
    zabbix.call("host.get",
        {
            "search": {"host": ""},
            "output": "extend",
            "sortfield": "host",
            "searchWildcardsEnabled": 1
        }
        , function (err, resp, body) {
            if( !err ) {
                body.result.forEach(function (host) {
                    self.hosts.push(host);
                    self.idToHost[host.hostid] = host;
                    self.nameToHost[host.name] = host;
                });

                callback();
            }
        }
    );
};

Hosts.prototype.getHostById = function(hostId) {
    return this.idToHost[hostId];
};

Hosts.prototype.getHostByName = function(hostName) {
    return this.nameToHost[hostName];
};

module.exports = Hosts;
