require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

// Configurare Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bug Management API',
      version: '1.0.0',
      description: 'API for managing bugs and projects',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./server.js'], // Asigură-te că documentația Swagger este adăugată corect
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Căile către fișierele JSON
const usersFilePath = path.join(__dirname, 'users.json');
const projectsFilePath = path.join(__dirname, 'projects.json');

// Funcții pentru utilizatori
function readUsers() {
  if (!fs.existsSync(usersFilePath)) return [];
  const data = fs.readFileSync(usersFilePath, 'utf-8');
  return JSON.parse(data);
}

// Funcție pentru a scrie utilizatorii în fișier
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

// Ruta principală
app.get('/', (req, res) => {
  res.send('WELCOME to BUG MANAGEMENT API!');
});

// Endpoint pentru înregistrare utilizatori
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "student@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email already in use
 */
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

// Endpoint pentru autentificare
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "student@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
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

// Endpoint pentru înregistrarea proiectelor
/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Register a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Bug Tracker"
 *               repositoryUrl:
 *                 type: string
 *                 example: "https://github.com/example/bug-tracker"
 *               teamMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["member1@example.com", "member2@example.com"]
 *     responses:
 *       201:
 *         description: Project registered successfully
 *       400:
 *         description: Invalid project data
 *       401:
 *         description: Unauthorized access
 */
app.post('/projects', authenticateToken, (req, res) => {
  const { name, repositoryUrl, teamMembers } = req.body;

  if (!name || !repositoryUrl || !Array.isArray(teamMembers)) {
    return res.status(400).json({ message: 'Invalid project data' });
  }

  const projects = readProjects();
  const newProject = {
    id: projects.length + 1,
    name,
    repositoryUrl,
    teamMembers,
  };
  projects.push(newProject);
  writeProjects(projects);

  res.status(201).json({ message: 'Project registered successfully', project: newProject });
});

// Endpoint pentru obținerea tuturor proiectelor
/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Returns all projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   repositoryUrl:
 *                     type: string
 *                   teamMembers:
 *                     type: array
 *                     items:
 *                       type: string
 */

app.get('/users', (req, res) => {
  try {
    const users = readUsers();

    // Ascunde parola din răspuns
    const usersWithoutPasswords = users.map(user => ({
      id: user.id,
      email: user.email,
    }));

    res.status(200).json(usersWithoutPasswords);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
app.get('/projects', (req, res) => {
  try {
    const projects = readProjects();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Pornirea serverului
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
