const {expect} = require('chai');
const {getDb, getStore} = require('./index');
const fs = require('fs-extra');
const path = require('path');

before(() => {
    fs.removeSync('.test');
});

after(() => {
    fs.removeSync('.test');
});

describe('getDb', () => {

    let db;
    beforeEach(() => {
        db = getDb('.test');
    });

    it('should get the db filename', () => {
        expect(path.resolve(db.getFilename('file'))).to.equal(path.resolve('.test/file.json'));
        expect(path.resolve(db.getFilename('file.json'))).to.equal(path.resolve('.test/file.json'));
    });

    describe('should write and read an object to and from the db', () => {
        const toSave = { test: 'test' };

        it('sync', () => {
            db.setSync('file', toSave);
            expect(db.getSync('file')).to.eql(toSave);
        });

        it('async', () => {
            return db.set('file', toSave)
                .then(() => {
                    return db.get('file');
                })
                .then(obj => {
                    expect(obj).to.eql(toSave);
                });
        });
    });

    it('should initialize', () => {
        const get = () => db.getSync('test');
        expect(get).to.throw();
        db.init('test');
        expect(get).not.to.throw();
    });
});

const mocker = obj => {
    for (let k in obj) {
        const fn = obj[k];
        if (typeof fn !== 'function') continue;
        obj[k] = function (...args) {
            obj[k].callCount++;
            obj[k].args.push(args);
            const ret = fn.apply(this, args);
            obj[k].retValues.push(ret);
            return ret;
        };

        obj[k].reset = () => {
            obj[k].callCount = 0;
            obj[k].args = [];
            obj[k].retValues = [];
        };

        obj[k].reset();
    }

    return obj;
}

describe('getStore', () => {

    let dbMock, store;

    beforeEach(() => {
        dbMock = mocker({
            set() {

            },
            setSync() {
            },
            init() {
            }
        });

        store = getStore('test', dbMock);
    });

    it('should initialize', () => {
        expect(dbMock.init).to.have.property('callCount', 1);
    });

    describe('should get and set values', () => {
        it('sync', (cb) => {
            store.set('key', 'value');
            expect(store.get('key')).to.equal('value');
            setTimeout(() => {
                expect(dbMock.setSync).to.have.property('callCount', 1);
                cb();
            }, 100);
        });

        it('async', () => {
            // everything is cached, so no async methods
        });
    });

    it('should debounce save', (cb) => {
        for (let i = 0; i < 5; i++) {
            store.save();
            store.saveSync();
        }

        setTimeout(() => {
            expect(dbMock.set).to.have.property('callCount', 1);
            expect(dbMock.setSync).to.have.property('callCount', 1);
            cb();
        }, 100);
    });

    it('should delete', () => {
        store.set('key', 'value');
        expect(store.get('key')).to.equal('value');
        store.delete('key');
        expect(store.get('key')).to.be.undefined;
    });
});