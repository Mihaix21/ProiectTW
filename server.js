require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');

const app = express();
app.use(express.json());

// Încarcă fișierul YAML pentru Swagger
const swaggerDocument = yaml.load('./BugManagementAPI.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Căile către fișierele JSON
const usersFilePath = path.join(__dirname, 'users.json');
const projectsFilePath = path.join(__dirname, 'projects.json');

// Funcții pentru utilizatori
function readUsers() {
  if (!fs.existsSync(usersFilePath)) return [];
  const data = fs.readFileSync(usersFilePath, 'utf-8');
  return JSON.parse(data);
}

function writeUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

// Funcții pentru proiecte
function readProjects() {
  if (!fs.existsSync(projectsFilePath)) return [];
  const data = fs.readFileSync(projectsFilePath, 'utf-8');
  return JSON.parse(data || '[]');
}

function writeProjects(projects) {
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2), 'utf-8');
}

// Middleware pentru autentificare
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecretKey');
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// Rute
app.get('/', (req, res) => {
  res.send('WELCOME to BUG MANAGEMENT API!');
});

app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  const users = readUsers();
  if (users.find(user => user.email === email)) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, email, password: hashedPassword };
  users.push(newUser);
  writeUsers(users);

  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const users = readUsers();
  const user = users.find(user => user.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'defaultSecretKey', { expiresIn: '1h' });
  res.status(200).json({ token });
});

// Endpoint pentru adăugarea unui proiect
app.post('/projects', authenticateToken, (req, res) => {
  const { name, repositoryUrl, teamMembers } = req.body;

  // Verifică dacă utilizatorul este autentificat și există în baza de date
  const users = readUsers();
  const loggedInUser = users.find(user => user.id === req.user.id);

  if (!loggedInUser) {
    return res.status(403).json({ message: 'User not authorized to add a project' });
  }

  // Validează datele proiectului
  if (!name || !repositoryUrl || !Array.isArray(teamMembers)) {
    return res.status(400).json({ message: 'Invalid project data' });
  }

  // Creează proiectul
  const projects = readProjects();
  const newProject = {
    id: projects.length + 1,
    name,
    repositoryUrl,
    teamMembers,
    createdBy: loggedInUser.email // Adaugă email-ul utilizatorului care a creat proiectul
  };

  // Adaugă proiectul la baza de date
  projects.push(newProject);
  writeProjects(projects);

  res.status(201).json({ message: 'Project registered successfully', project: newProject });
});


app.get('/projects', authenticateToken, (req, res) => {
  try {
    const projects = readProjects();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/users', authenticateToken, (req, res) => {
  try {
    const users = readUsers();
    const usersWithoutPasswords = users.map(user => ({
      id: user.id,
      email: user.email,
    }));
    res.status(200).json(usersWithoutPasswords);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Pornirea serverului
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
