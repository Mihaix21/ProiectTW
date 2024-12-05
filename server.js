const express = require('express'); 
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const mongoose = require('mongoose'); // Importă Mongoose pentru baza de date
const app = express();
const port = 3000;

// Conectarea la MongoDB
mongoose.connect('mongodb://localhost:27017/bugManagement')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1);
  });

// Middleware pentru parsarea JSON
app.use(express.json());

// Încarcă fișierul OpenAPI (YAML)
const swaggerDocument = YAML.load('./BugManagementAPI.yaml');

// Integrează Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Definirea schemelor pentru baza de date cu Mongoose
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

// Crearea modelelor pentru utilizatori, proiecte și bug-uri
const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Bug = mongoose.model('Bug', bugSchema);

// Endpoint pentru înregistrarea unui utilizator
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

// Endpoint pentru login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.status(200).json({ token: "your-jwt-token-here" }); // Simplificat pentru exemplu
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Endpoint pentru crearea unui proiect
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

// Endpoint pentru obținerea listei de proiecte
app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Endpoint pentru raportarea unui bug la un proiect
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

// Endpoint pentru a obține bug-urile unui proiect
app.get('/projects/:projectId/bugs', async (req, res) => {
  const { projectId } = req.params;

  try {
    const bugs = await Bug.find({ projectId });
    res.status(200).json(bugs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Pornirea serverului
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
});
