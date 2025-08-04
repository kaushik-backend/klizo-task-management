const request = require('supertest');
const chai = require('chai');
const mongoose = require('mongoose');
const app = require('../../src/app'); // Assuming app.js exports the Express app
const { expect } = chai;
const Sprint = require('../../src/models/Sprint');
const Project = require('../../src/models/Project');

// Ensure the Project model is not recompiled
const ProjectModel = mongoose.models.Project || mongoose.model('Project', new mongoose.Schema({
  name: String,
  description: String,
  
}));

describe('POST /sprints', function () {
  let projectId; // We'll need to create a dummy project ID for testing
  
  before(async () => {
    // Create a dummy project in DB before running the tests
    const newProject = new ProjectModel({
      name: 'Test Project',
      description: 'Test Project Description',
    });

    const savedProject = await newProject.save();
    projectId = savedProject._id;
  });

  after(async () => {
    // Cleanup: Delete all projects and sprints after tests are done
    await Sprint.deleteMany({});
    await mongoose.connection.db.dropDatabase();
  });

  it('should create a sprint with valid data', async function () {
    const sprintData = {
      projectId: projectId,
      name: 'Sprint 1',
      startDate: '2025-07-29T09:00:00.000Z',
      endDate: '2025-08-12T18:00:00.000Z',
    };

    const res = await request(app)
      .post('/sprints')
      .send(sprintData)
      .expect(201); // Expect status code 201 for successful creation

    expect(res.body.success).to.equal(true);
    expect(res.body.data).to.have.property('_id');
    expect(res.body.data.name).to.equal('Sprint 1');
    expect(res.body.data.projectId).to.equal(sprintData.projectId.toString());
  });

  it('should return 400 if projectId is invalid', async function () {
    const sprintData = {
      projectId: 'invalid-id',
      name: 'Sprint 2',
      startDate: '2025-07-29T09:00:00.000Z',
      endDate: '2025-08-12T18:00:00.000Z',
    };

    const res = await request(app)
      .post('/sprints')
      .send(sprintData)
      .expect(400); // Invalid project ID

    expect(res.body.success).to.equal(false);
    expect(res.body.errors[0].msg).to.equal('Valid projectId is required');
  });

  it('should return 409 if sprint name already exists in the project', async function () {
    const sprintData = {
      projectId: projectId,
      name: 'Sprint 1', // This name already exists
      startDate: '2025-07-29T09:00:00.000Z',
      endDate: '2025-08-12T18:00:00.000Z',
    };

    // Creating the first sprint
    await request(app)
      .post('/sprints')
      .send(sprintData)
      .expect(201);

    // Trying to create a sprint with the same name
    const res = await request(app)
      .post('/sprints')
      .send(sprintData)
      .expect(409); // Conflict due to duplicate name

    expect(res.body.success).to.equal(false);
    expect(res.body.message).to.equal('Sprint name already exists in this project');
  });

  it('should return 400 if startDate is in invalid format', async function () {
    const sprintData = {
      projectId: projectId,
      name: 'Sprint 2',
      startDate: 'invalid-date',
      endDate: '2025-08-12T18:00:00.000Z',
    };

    const res = await request(app)
      .post('/sprints')
      .send(sprintData)
      .expect(400); // Invalid startDate format

    expect(res.body.success).to.equal(false);
    expect(res.body.errors[0].msg).to.equal('Start date should be in ISO8601 format');
  });

  it('should return 400 if endDate is missing or invalid', async function () {
    const sprintData = {
      projectId: projectId,
      name: 'Sprint 3',
      startDate: '2025-07-29T09:00:00.000Z',
    };

    const res = await request(app)
      .post('/sprints')
      .send(sprintData)
      .expect(400); // Missing endDate

    expect(res.body.success).to.equal(false);
    expect(res.body.errors[0].msg).to.equal('End date should be in ISO8601 format');
  });
});
