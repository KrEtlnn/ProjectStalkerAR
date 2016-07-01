ns.modules.define('cloud.dataSyncApi.Dataset', [
    'cloud.dataSyncApi.Record',
    'cloud.dataSyncApi.Operation',
    'cloud.dataSyncApi.FieldOperation',
    'cloud.dataSyncApi.Conflict',
    'cloud.Error',
    'component.util'
], function (provide, Record, Operation, FieldOperation, Conflict, Error, util) {
    var Dataset = function (revision, records, parameters) {
            var index = this._index = {},
                collectionId = this._collectionId = parameters && parameters.collection_id,
                collectionPolicy = parameters && parameters.collection_policy || 'restrict';

            this._revision = Number(revision);
            this._revisionHistory = [];

            this._records = records.map(function (record) {
                if (!(record instanceof Record)) {
                    if (collectionId && !record.collection_id) {
                        record = util.extend({
                            collection_id: collectionId
                        }, record);
                    }
                    record = new Record(record);
                }
                return record;
            });

            if (collectionId) {
                this._records = this._records.filter(function (record) {
                    if (record.getCollectionId() != collectionId) {
                        if (collectionPolicy == 'restrict') {
                            throw new Error({
                                message: '`collection_id` Must Match Current Filter'
                            });
                        }
                        return false;
                    }
                    return true;
                });
            }

            this._records.forEach(function (record) {
                var collection_id = record.getCollectionId(),
                    record_id = record.getRecordId();
                if (!index[collection_id]) {
                    index[collection_id] = {};
                }
                if (index[collection_id][record_id]) {
                    throw new Error ({
                        message: 'Record with `collection_id` and `record_id` Provided Already Exists',
                        collection_id: collection_id,
                        record_id: record_id
                    });
                } else {
                    index[collection_id][record_id] = record;
                }
                return record;
            });
        };

    Dataset.json = {
        deserialize: function (json, parameters) {
            return new Dataset(
                json.revision,
                json.records.items.map(function (item) {
                    return Record.json.deserialize(item);
                }),
                parameters
            );
        },

        serialize: function (dataset) {
            var items = [],
                it = dataset.iterator(),
                item = it.next();

            while (!item.done) {
                items.push(Record.json.serialize(item.value));
                item = it.next();
            }

            return {
                revision: dataset.getRevision(),
                records: {
                    items: items
                }
            };
        }
    };

    util.defineClass(Dataset, {
        getRecord: function (collection_id, record_id) {
            if (this._collectionId) {
                if (!record_id) {
                    record_id = collection_id;
                    collection_id = this._collectionId;
                } else {
                    if (collection_id != this._collectionId) {
                        throw new Error({
                            message: '`collection_id` Parameter Must Match Collection Filter'
                        });
                    }
                }
            }
            if (!collection_id) {
                throw new Error({
                    message: '`collection_id` Parameter Required'
                });
            }
            if (!record_id) {
                throw new Error({
                    message: '`record_id` Parameter Required'
                });
            }
            return this._index[collection_id] && this._index[collection_id][record_id];
        },

        getRevision: function () {
            return this._revision;
        },

        getLength: function () {
            return this._records.length;
        },

        getCollectionId: function () {
            return this._collectionId;
        },

        iterator: function (collection_id) {
            var counter = -1,
                records = this._records;
            return {
                next: function () {
                    if (collection_id) {
                        do {
                            counter++;
                        } while (counter < records.length && records[counter].getCollectionId() != collection_id);
                    } else {
                        counter++;
                    }
                    if (counter < records.length) {
                        return {
                            value: records[counter]
                        };
                    }
                    return {
                        done: true
                    };
                }
            };
        },

        applyDeltas: function (deltas) {
            var index = this._index,
                revisionHistory = this._revisionHistory,
                revision = this._revision,
                collectionIdFilter = this._collectionId;

            deltas.forEach(function (delta) {
                var alteredRecords = {};

                if (delta.base_revision != revision) {
                    throw new Error({
                        message: 'Incorrect delta base_revision'
                    });
                }

                delta.changes.forEach(function (change) {
                    var collection_id = change.collection_id,
                        record_id = change.record_id;

                    if (!collectionIdFilter || collection_id == collectionIdFilter) {
                        if (!alteredRecords[collection_id]) {
                            alteredRecords[collection_id] = {};
                        }
                        alteredRecords[collection_id][record_id] = true;

                        switch (change.change_type) {
                            case 'insert':
                            case 'set':
                                if (!index[collection_id]) {
                                    index[collection_id] = {};
                                }
                                index[collection_id][record_id] = Record.json.deserialize(change, true);
                                break;
                            case 'delete':
                                delete index[collection_id][record_id];
                                break;
                            case 'update':
                                var record = index[collection_id][record_id];
                                change.changes.forEach(function (fieldChange) {
                                    record.applyFieldOperation(FieldOperation.json.deserialize(fieldChange));
                                });
                                break;
                        }
                    }
                });

                revisionHistory.push({
                    base_revision: delta.base_revision,
                    delta_id: delta.delta_id,
                    revision: delta.revision,
                    alteredRecords: alteredRecords,
                    changes: delta.changes
                });

                revision = delta.revision;
            });

            var records = this._records = [];
            Object.keys(index).forEach(function (collection_id) {
                Object.keys(index[collection_id]).forEach(function (record_id) {
                    records.push(index[collection_id][record_id]);
                });
            });
            this._revision = revision;
        },

        ifModifiedSince: function (options) {
            var collection_id = options.collection_id || this._collectionId,
                record_id = options.record_id,
                revision = options.revision,
                position = this._locateRevision(revision);

            if (position != -1) {
                for (var i = position; i < this._revisionHistory.length; i++) {
                    var item = this._revisionHistory[i];

                    if (item.alteredRecords[collection_id] && item.alteredRecords[collection_id][record_id]) {
                        return true;
                    }
                }
            }

            return false;
        },

        _locateRevision: function (revision) {
            for (var i = 0; i < this._revisionHistory.length; i++) {
                if (this._revisionHistory[i].base_revision == revision) {
                    return i;
                }
            }
            return -1;
        },

        dryRun: function (revision, operations) {
            var conflicts = [],
                index = copyIndex(this._index),
                originalIndex = this._index,
                collectionIdFilter = this._collectionId;

            operations.forEach(function (operation, i) {
                var collection_id = operation.getCollectionId(),
                    record_id = operation.getRecordId();

                if (!collectionIdFilter || collection_id == collectionIdFilter) {
                    if (this.ifModifiedSince({
                            collection_id: collection_id,
                            record_id: record_id,
                            revision: revision
                        })) {
                        conflicts.push({
                            index: i,
                            conflict: new Conflict({
                                type: 'both_modified',
                                operation: operation
                            })
                        });
                    } else {
                        switch (operation.getType()) {
                            case 'insert':
                                if (index[collection_id] && index[collection_id][record_id]) {
                                    conflicts.push({
                                        index: i,
                                        conflict: new Conflict({
                                            type: 'record_already_exists',
                                            operation: operation
                                        })
                                    });
                                } else {
                                    if (!index[collection_id]) {
                                        index[collection_id] = {};
                                    }
                                    index[collection_id][record_id] = Record.json.deserialize(
                                        Operation.json.serialize(operation), true
                                    );
                                }
                                break;
                            case 'set':
                                if (!index[collection_id]) {
                                    index[collection_id] = {};
                                }
                                index[collection_id][record_id] = Record.json.deserialize(
                                    Operation.json.serialize(operation), true
                                );
                                break;
                            case 'delete':
                                if (!index[collection_id] || !index[collection_id][record_id]) {
                                    conflicts.push({
                                        index: i,
                                        conflict: new Conflict({
                                            type: 'delete_non_existent_record',
                                            operation: operation
                                        })
                                    });
                                } else {
                                    delete index[collection_id][record_id];
                                }
                                break;
                            case 'update':
                                if (!index[collection_id] || !index[collection_id][record_id]) {
                                    conflicts.push({
                                        index: i,
                                        conflict: new Conflict({
                                            type: 'update_non_existent_record',
                                            operation: operation
                                        })
                                    });
                                } else {
                                    var record = index[collection_id][record_id],
                                        fieldChangeConflicts = [];

                                    if (record === true) {
                                        record = originalIndex[collection_id][record_id].copy();
                                    }

                                    operation.getFieldOperations().forEach(function (fieldOperation, index) {
                                        var error = record.dryRun(fieldOperation);
                                        if (error) {
                                            fieldChangeConflicts.push({
                                                type: error,
                                                index: index
                                            });
                                        } else {
                                            record.applyFieldOperation(fieldOperation);
                                        }
                                    });

                                    if (fieldChangeConflicts.length) {
                                        conflicts.push({
                                            index: i,
                                            conflict: new Conflict({
                                                type: 'invalid_field_change',
                                                operation: operation,
                                                field_change_conflicts: fieldChangeConflicts
                                            })
                                        });
                                    } else {
                                        index[collection_id][record_id] = record;
                                    }
                                }
                                break;
                        }
                    }
                }
            }, this);

            return {
                conflicts: conflicts,
                revisionHistory: conflicts.length ? this._getRevisionHistory(revision) : []
            };
        },

        _getRevisionHistory: function (fromRevision) {
            var position = this._locateRevision(fromRevision);
            if (position != -1) {
                var result = [];

                for (var i = position; i < this._revisionHistory.length; i++) {
                    var item = this._revisionHistory[i];

                    result.push({
                        base_revision: item.base_revision,
                        revision: item.revision,
                        delta_id: item.delta_id,
                        operations: makeOperations(item.changes)
                    });
                }

                return result;
            } else {
                return [];
            }
        }
    });

    function copyIndex (index) {
        return Object.keys(index).reduce(function (copy, collection_id) {
            copy[collection_id] = Object.keys(index[collection_id]).reduce(function (collection, record_id) {
                collection[record_id] = true;
                return collection;
            }, {});
            return copy;
        }, {});
    }

    function makeOperations (changes) {
        return changes.map(function (change) {
            return Operation.json.deserialize(change);
        });
    }

    provide(Dataset);
});