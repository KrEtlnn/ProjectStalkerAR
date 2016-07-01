var expect = expect || require('expect.js'),
    ya = ya || require('../build/cloud-data-sync-api.js');

if (typeof XMLHttpRequest == 'undefined') {
    XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
}

ya.modules.define('test.cloud.dataSyncApi.http', [
    'cloud.dataSyncApi.http',
    'cloud.dataSyncApi.config',
    'global'
], function (provide, httpApi, config, global) {
    var params = typeof process != 'undefined' ?
            Object.keys(process.env).reduce(function (params, key) {
                if (key.indexOf('npm_config_') == 0) {
                    params[key.slice('npm_config_'.length)] = process.env[key];
                }
                return params;
            }, {}) :
            (window.location.search || '').replace(/^\?/, '').split('&').reduce(function (params, param) {
                var pair = param.split('=', 2);
                params[pair[0]] = pair[1];
                return params;
            }, {}),
        token = params.token,
        context = params.context || 'app',
        name = params.db_name || 'ya_cloud_api_test';

    function rawCreateDatabase (done, dontPurge) {
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', config.apiHost + 'v1/data/' +
            context + '/databases/' + name, true);
        if (token) {
            xhr.setRequestHeader('Authorization', 'OAuth ' + token);
        } else {
            xhr.withCredentials = true;
        }

        xhr.send();

        xhr.onload = function () {
            if (this.status == 201 || dontPurge) {
                done();
            } else {
                rawDeleteDatabase(function () {
                    rawCreateDatabase(done, true);
                });
            }
        };
        xhr.onerror = done;
    }

    function rawDeleteDatabase (done) {
        var xhr = new XMLHttpRequest();
        xhr.open('DELETE', config.apiHost + 'v1/data/' +
            context + '/databases/' + name, true);
        if (token) {
            xhr.setRequestHeader('Authorization', 'OAuth ' + token);
        } else {
            xhr.withCredentials = true;
        }
        xhr.send();

        xhr.onload = function () { done() };
        xhr.onerror = done;
    }

    describe('cloud.dataSyncApi.http', function () {
        it('Database creation & deletion', function (done) {
            var fail = function (e) {
                    rawDeleteDatabase(function () {
                        done(e);
                    });
                };

            rawCreateDatabase(getDatabase);

            function getDatabase () {
                global.setTimeout(function () {
                    httpApi.getDatabases({
                        context: context,
                        database_id: name,
                        token: token,
                        with_credentials: token ? false : true
                    }).then(function (res) {
                        expect(res.code).to.be(200);
                        deleteDatabase();
                    }, fail).fail(fail);
                }, 100);
            }

            function deleteDatabase () {
                global.setTimeout(function () {
                    httpApi.deleteDatabase({
                        context: context,
                        database_id: name,
                        token: token,
                        with_credentials: token ? false : true
                    }).then(function (res) {
                        expect(res.code).to.be(204);
                        putDatabase();
                    }, fail).fail(fail);
                }, 100);
            }

            function putDatabase () {
                global.setTimeout(function () {
                    httpApi.putDatabase({
                        context: context,
                        database_id: name,
                        token: token,
                        with_credentials: token ? false : true
                    }).then(function (res) {
                        expect(res.code).to.be(201);
                        rawDeleteDatabase(done)
                    }, fail).fail(fail);
                }, 100);
            }
        });

        it('Snapshots & deltas', function (done) {
            var fail = function (e) {
                    rawDeleteDatabase(function () {
                        done(e);
                    });
                },
                revisions = [];

            rawCreateDatabase(getRevision);

            function getRevision () {
                httpApi.getDatabases({
                    token: token,
                    context: context,
                    database_id: name,
                    with_credentials: token ? false : true
                }).then(function (res) {
                    revisions.push(res.data.revision);
                    postDeltas();
                }, fail).fail(fail);
            }

            function postDeltas () {
                httpApi.postDeltas({
                    token: token,
                    context: context,
                    database_id: name,
                    base_revision: revisions[0],
                    with_credentials: token ? false : true,
                    data: {
                        delta_id: 'id1',
                        changes: [{
                            record_id: 'id1',
                            collection_id: 'id1',
                            change_type: 'insert',
                            changes: [
                                {
                                    change_type: 'set',
                                    field_id: 'field_double',
                                    value: {
                                        type: 'double',
                                        double: 1.57
                                    }
                                }, {
                                    change_type: 'set',
                                    field_id: 'field_integer',
                                    value: {
                                        type: 'integer',
                                        integer: 3
                                    }
                                }
                            ]
                        }]
                    }
                }).then(function (res) {
                    revisions.push(Number(res.headers.etag));
                    getSnapshot();
                }, fail).fail(fail);

                function getSnapshot () {
                    httpApi.getSnapshot({
                        context: context,
                        database_id: name,
                        token: token,
                        with_credentials: token ? false : true
                    }).then(function (res) {
                        expect(res.data.records_count).to.be(1);
                        expect(res.data.revision).to.be(revisions[1]);
                        getDeltas();
                    }, fail).fail(fail);
                }

                function getDeltas () {
                    httpApi.getDeltas({
                        context: context,
                        token: token,
                        database_id: name,
                        base_revision: revisions[0],
                        with_credentials: token ? false : true
                    }).then(function (res) {
                        expect(res.data.revision).to.be.equal(revisions[1]);
                        rawDeleteDatabase(done);
                    }, fail).fail(fail);
                }
            }
        });
    });

    provide();
});