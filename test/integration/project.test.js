const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../../src/app');  
const Project = require('../../src/models/Project');  // Replace with the correct path to the Project model
const Employee = require('../models/Employee'); // Assuming Employee model exists
const Backlog = require('../models/Backlog'); // Assuming Backlog model exists

chai.use(chaiHttp);

describe('Project API', () => {
  let employeeId;
  let projectId;

  before(async () => {
    // Create a dummy employee for ownerId
    const dummyEmployee = new Employee({
      name: 'Test Employee',
      email: 'test@company.com',
      role: 'Developer',
    });

    const savedEmployee = await dummyEmployee.save();
    employeeId = savedEmployee._id;  // Store the employee ID for use in creating a project
  });

  afterEach(async () => {
    // Clean up after each test by deleting the created project
    await Project.deleteMany({});
    await Employee.deleteMany({});
  });

  it('should create a project with valid data', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'This is a test project.',
      ownerId: employeeId,  // Valid ownerId
      members: [],  // No members for this test
    };

    const res = await chai.request(app)
      .post('/sprints')  // Assuming this is the correct endpoint for creating a project
      .send(projectData)
      .set('Authorization', `Bearer ${yourAuthToken}`)  // Use a valid auth token
      .expect(201);  // Expect status code 201 for successful creation

    // Assertions
    expect(res.body.success).to.equal(true);
    expect(res.body.data).to.have.property('_id');
    expect(res.body.data.name).to.equal(projectData.name);
    expect(res.body.data.ownerId.toString()).to.equal(projectData.ownerId.toString());

    projectId = res.body.data._id;  // Save the created project ID for further tests
  });

  it('should return 400 if required fields are missing', async () => {
    const projectData = {
      // Missing name, description, or ownerId
    };

    const res = await chai.request(app)
      .post('/sprints')  // Same endpoint
      .send(projectData)
      .set('Authorization', `Bearer ${yourAuthToken}`)
      .expect(400);

    // Assertions
    expect(res.body.success).to.equal(false);
    expect(res.body.errors).to.have.length.above(0);
    expect(res.body.errors[0].msg).to.equal('Name is required');
  });

  it('should return 400 for invalid ownerId', async () => {
    const projectData = {
      name: 'Test Project with Invalid Owner',
      description: 'This project has an invalid ownerId.',
      ownerId: mongoose.Types.ObjectId(),  // Invalid ownerId
    };

    const res = await chai.request(app)
      .post('/sprints')  // Same endpoint
      .send(projectData)
      .set('Authorization', `Bearer ${yourAuthToken}`)
      .expect(400);

    // Assertions
    expect(res.body.success).to.equal(false);
    expect(res.body.message).to.equal('Invalid ownerId. No matching employee found in attendance system.');
  });

  it('should return 409 if project name already exists', async () => {
    const projectData = {
      name: 'Test Project',  // Duplicate name from the first test
      description: 'This project already exists.',
      ownerId: employeeId,
    };

    const res = await chai.request(app)
      .post('/sprints')  // Same endpoint
      .send(projectData)
      .set('Authorization', `Bearer ${yourAuthToken}`)
      .expect(409);

    // Assertions
    expect(res.body.success).to.equal(false);
    expect(res.body.message).to.equal('Project already exists.');
  });

  after(async () => {
    // Clean up: Delete all projects and employees after tests are done
    await Project.deleteMany({});
    await Employee.deleteMany({});
    await mongoose.connection.db.dropDatabase();
  });
});
