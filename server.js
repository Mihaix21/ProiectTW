const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;

require('dotenv').config(); // Pentru a încărca variabilele de mediu din fișierul .env

// Conectarea la baza de date MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('Could not connect to MongoDB Atlas', err);
    process.exit(1);
  });

const jwtSecret = 'MIROSLAV';
app.use(express.json());

// Configurare Swagger pentru documentație API
const swaggerDocument = YAML.load('./BugManagementAPI.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Definirea schemelor pentru baza de date
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Member', 'Tester'], required: true }
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  repositoryUrl: { type: String, required: true },
  teamMembers: [
    {
      email: { type: String, required: true },
      role: { type: String, enum: ['Member', 'Tester'], required: true }
    }
  ],
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

// Ruta de bază
app.get('/', (req, res) => {
  res.send('Welcome to Bug Management API! Access /api-docs for documentation.');
});

// Înregistrare utilizator nou
app.post('/auth/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Email, password, and role are required" });
  }

  try {
    const user = new User({ email, password, role });
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

// Autentificare utilizator
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email, password });
    if (user) {
      const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '24h' });
      res.status(200).json({ token, role: user.role });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Verificare autentificare și autorizare pentru rute protejate
const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Access denied. You do not have the required role." });
      }

      req.user = decoded; // Salvează utilizatorul decodat în cerere pentru a-l folosi mai târziu
      next();
    } catch (err) {
      return res.status(401).json({ message: "Authentication failed" });
    }
  };
};

// Creare proiect nou (doar pentru utilizatori cu rol de "Member")
app.post('/projects', verifyRole('Member'), async (req, res) => {
  const { name, repositoryUrl, teamMembers } = req.body;
  if (!name || !repositoryUrl || !teamMembers) {
    return res.status(400).json({ message: "Invalid project data" });
  }

  try {
    const project = new Project({ name, repositoryUrl, teamMembers });
    await project.save();
    res.status(201).json({ message: "Project successfully registered", projectId: project._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Obținerea listei de proiecte (disponibil pentru toți utilizatorii autentificați)
app.get('/projects', verifyRole(), async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Ștergerea unui proiect (doar pentru utilizatori cu rol de "Member")
app.delete('/projects/:projectId', verifyRole('Member'), async (req, res) => {
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

// Raportarea unui bug (doar pentru utilizatori cu rol de "Tester")
app.post('/projects/:projectId/bugs', verifyRole('Tester'), async (req, res) => {
  const { projectId } = req.params;
  const { title, description, severity, priority, commitLink } = req.body;

  if (!title || !severity || !priority) {
    return res.status(400).json({ message: "Invalid bug data" });
  }

  try {
    const bug = new Bug({ projectId, title, description, severity, priority, commitLink });
    await bug.save();
    res.status(201).json({ message: "Bug successfully reported", bugId: bug._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Alocarea unui bug (doar pentru utilizatori cu rol de "Member")
app.put('/projects/:projectId/bugs/:bugId/assign', verifyRole('Member'), async (req, res) => {
  const { projectId, bugId } = req.params;
  const { assignee } = req.body;

  if (!assignee) {
    return res.status(400).json({ message: "Assignee is required" });
  }

  try {
    const bug = await Bug.findOneAndUpdate({ _id: bugId, projectId }, { assignee }, { new: true });
    if (!bug) {
      return res.status(404).json({ message: "Bug or project not found" });
    }
    res.status(200).json({ message: "Bug successfully assigned", bug });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Pornirea serverului
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
});
