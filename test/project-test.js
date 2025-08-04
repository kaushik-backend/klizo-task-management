const request = require('supertest');
const chai = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { app } = require('../src/app'); 
const { expect } = chai;
const Project = require('../src/./models/Project');  // replace with actual path to the Project model

describe('DELETE /projects/:id', () => {
  let findByIdStub;
  let saveStub;

  afterEach(() => {
    sinon.restore();
  });

  it('should return 404 if the project is not found', async () => {
    // Arrange: Stub the Project's findById method to return null
    findByIdStub = sinon.stub(Project, 'findById').resolves(null);

    // Act: Send DELETE request to the endpoint
    const res = await request(app).delete('/projects/688c85593e80eb23d77833d1'); // Replace with an actual project ID

    // Assert: Check if the correct error message and status code is returned
    expect(res.status).to.equal(404);
    expect(res.body.success).to.equal(false);
    expect(res.body.message).to.equal('Project not found');
  });

  it('should return 500 if the project is already deleted', async () => {
    // Arrange: Stub the Project's findById method to return a project that is already deleted
    const mockProject = { isDeleted: true, save: sinon.spy() };
    findByIdStub = sinon.stub(Project, 'findById').resolves(mockProject);

    // Act: Send DELETE request to the endpoint
    const res = await request(app).delete('/projects/688c85593e80eb23d77833d1');

    // Assert: Check if the correct error message and status code is returned
    expect(res.status).to.equal(500);
    expect(res.body.success).to.equal(false);
    expect(res.body.message).to.equal('Project is already deleted');
  });

  it('should mark the project as deleted successfully', async () => {
    // Arrange: Stub the Project's findById method to return a mock project
    const mockProject = { isDeleted: false, save: sinon.spy() };
    findByIdStub = sinon.stub(Project, 'findById').resolves(mockProject);
    saveStub = sinon.stub(mockProject, 'save').resolves(mockProject);  // Mock save method

    // Act: Send DELETE request to the endpoint
    const res = await request(app).delete('/projects/688c85593e80eb23d77833d1');

    // Assert: Check if the project was marked as deleted
    expect(res.status).to.equal(200);  // You can change the status code depending on your implementation
    expect(res.body.success).to.equal(true);
    expect(res.body.message).to.equal('Project deleted successfully');
    expect(mockProject.isDeleted).to.equal(true);  // Ensure that isDeleted is set to true
    expect(saveStub.calledOnce).to.be.true;  // Ensure that the save method was called once
  });

  it('should return 422 if the project ID is invalid', async () => {
    // Act: Send DELETE request with an invalid ID
    const res = await request(app).delete('/projects/invalid-id');

    // Assert: Check if the correct error message and status code is returned
    expect(res.status).to.equal(422);
    expect(res.body.success).to.equal(false);
    expect(res.body.errors[0].msg).to.equal('Invalid project ID');
  });
});
