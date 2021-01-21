const chai = require('chai');
const mockRequire = require('mock-require');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

const expect = chai.expect;
const sandbox = sinon.createSandbox();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// example golden path export unit tests of patients controller
describe('Test golden paths of patients controller', () => {
  class cloudantMock {
    constructor() {
      this.db = {
        create: () => Promise.reject({
          error: 'file_exists',
        }),
        use: () => {
          return {
            list: () => Promise.resolve({
              rows: [
                {
                  id: 'id',
                  doc: {
                    name: 'name',
                    timestamp: 'timestamp',
                  },
                },
              ],
            }),
            insert: (name) => Promise.resolve({
              id: 'id',
              name: 'name',
              timestamp: 'timestamp',
            }),
          };
        },
      };
    }
  }

  let patientsController;
  let res;
  before(() => {
    mockRequire('@cloudant/cloudant', cloudantMock);

    res = mockRequire.reRequire('express/lib/response');
    sandbox.stub(res, 'json');
    sandbox.spy(res, 'status');

    patientsController = mockRequire.reRequire(
      '../../../server/controllers/patients-controller',
    );
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
    mockRequire.stopAll();
  });

  it('should return some patients', () => {
    const mockReq = {};

    const resultPromise = patientsController.getPatients(mockReq, res);
    expect(resultPromise).to.eventually.be.fulfilled
      .then(() => {
        expect(res.status).to.have.been.calledOnceWith(200);
        expect(res.json).to.have.been.calledOnceWith([
          {
            _id: 'id',
            name: 'name',
            timestamp: 'timestamp',
          },
        ]);
      });
  });

  it('should correctly add a patient', () => {
    const mockReq = {
      body: {
        name: 'name',
        timestamp: 'timestamp',
      },
    };

    const resultPromise = patientsController.addPatient(mockReq, res);
    expect(resultPromise).to.eventually.be.fulfilled
      .then(() => {
        expect(res.status).to.have.been.calledOnceWith(201);
        expect(res.json).to.have.been.calledOnceWith({
          _id: 'id',
          name: 'name',
          timestamp: 'timestamp',
        });
      });
  });
});

// example unit tests of export failures in names controller
describe('Test failure paths of patients controller', () => {
  class cloudantMock {
    constructor() {
      this.db = {
        create: () => Promise.reject({
          error: 'another_error',
        }),
        use: () => {
          return {
            list: () => Promise.reject('There was an error with list.'),
            insert: (name) => Promise.reject('There was an error with insert.'),
          };
        },
      };
    }
  }

  let patientsController;
  let res;
  before(() => {
    mockRequire('@cloudant/cloudant', cloudantMock);

    res = mockRequire.reRequire('express/lib/response');
    sandbox.stub(res, 'json');
    sandbox.spy(res, 'status');

    patientsController = mockRequire.reRequire(
      '../../../server/controllers/patients-controller',
    );
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
    mockRequire.stopAll();
  });

  it('should fail getting patients', () => {
    const mockReq = {};

    const resultPromise = patientsController.getPatients(mockReq, res);
    expect(resultPromise).to.eventually.be.fulfilled
      .then(() => {
        expect(res.status).to.have.been.calledOnceWith(500);
        expect(res.json).to.have.been.calledOnceWith({
          message: 'Get patients failed.',
          error: 'There was an error with list.',
        });
      });
  });

  it('should fail to add a patient', () => {
    const mockReq = {
      body: {
        name: 'name',
        timestamp: 'timestamp',
      },
    };

    const resultPromise = patientsController.addPatient(mockReq, res);
    expect(resultPromise).to.eventually.be.fulfilled
      .then(() => {
        expect(res.status).to.have.been.calledOnceWith(500);
        expect(res.json).to.have.been.calledOnceWith({
          message: 'Add patient failed.',
          error: 'There was an error with insert.',
        });
      });
  });
});
