const express = require('express'); 
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const mongoose = require('mongoose'); 
const app = express();
const port = 3000;

mongoose.connect('mongodb://localhost:27017/bugManagement')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1);
  });


app.use(express.json());

const swaggerDocument = YAML.load('./BugManagementAPI.yaml');


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  repositoryUrl: { type: String, required: true },
  teamMembers: [{ type: String, required: true }],
});

const bugSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: String,
  severity: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  commitLink: String,
  assignee: String,
});


const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Bug = mongoose.model('Bug', bugSchema);


app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = new User({ email, password });
    await user.save();
    res.status(201).json({ message: "User successfully registered" });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ message: "User already exists" });
    } else {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
});


app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.status(200).json({ token: "your-jwt-token-here" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.post('/projects', async (req, res) => {
  const { name, repositoryUrl, teamMembers } = req.body;
  if (!name || !repositoryUrl || !teamMembers) {
    return res.status(400).json({ message: "Invalid project data" });
  }

  try {
    const project = new Project({ name, repositoryUrl, teamMembers });
    await project.save();
    res.status(201).json({ message: "Project successfully registered", projectId: project._id });
    console.log("Project added successfully");
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get('/projects', async (req, res) => {
    try {
      const projects = await Project.find();
      res.status(200).json(projects);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  });

app.delete('/projects/:projectId', async (req, res) => {
    const { projectId } = req.params;
    console.log(`Attempting to delete project with ID: ${projectId}`);
  
    try {
      const project = await Project.findByIdAndDelete(projectId);
      if (!project) {
        console.log("Project not found");
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(200).json({ message: "Project successfully deleted" });
    } catch (err) {
      console.error("Error occurred:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  });
  


app.post('/projects/:projectId/bugs', async (req, res) => {
  const { projectId } = req.params;
  const { title, description, severity, priority, commitLink } = req.body;

  if (!title || !severity || !priority) {
    return res.status(400).json({ message: "Invalid bug data" });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const bug = new Bug({ projectId, title, description, severity, priority, commitLink });
    await bug.save();
    res.status(201).json({ message: "Bug successfully reported", bugId: bug._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.put('/projects/:projectId/bugs/:bugId/assign', async (req, res) => {
  const { projectId, bugId } = req.params;
  const { assignee } = req.body;

  if (!assignee) {
    return res.status(400).json({ message: "Assignee is required" });
  }

  try {
    const bug = await Bug.findOneAndUpdate(
      { _id: bugId, projectId },
      { assignee },
      { new: true }
    );
    if (!bug) {
      return res.status(404).json({ message: "Bug or project not found" });
    }
    res.status(200).json({ message: "Bug successfully assigned", bug });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.put('/projects/:projectId/bugs/:bugId/resolve', async (req, res) => {
  const { projectId, bugId } = req.params;
  const { status, resolutionCommitLink } = req.body;

  if (!status || status !== 'Resolved') {
    return res.status(400).json({ message: "Status must be 'Resolved'" });
  }

  try {
    const bug = await Bug.findOneAndUpdate(
      { _id: bugId, projectId },
      { status, commitLink: resolutionCommitLink },
      { new: true }
    );
    if (!bug) {
      return res.status(404).json({ message: "Bug or project not found" });
    }
    res.status(200).json({ message: "Bug successfully resolved", bug });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.delete('/projects/:projectId/bugs/:bugId', async (req, res) => {
  const { projectId, bugId } = req.params;

  try {
    const bug = await Bug.findOneAndDelete({ _id: bugId, projectId });
    if (!bug) {
      return res.status(404).json({ message: "Bug or project not found" });
    }
    res.status(200).json({ message: "Bug successfully deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
});
