const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Welcome to the Bug Management API');
});
app.use(express.json());

const swaggerDocument = YAML.load('./BugManagementAPI.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log("Login endpoint accessed"); 

    if (email === "student@example.com" && password === "mysecurepassword") {
        res.status(200).json({ token: "your-jwt-token-here" });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

app.post('/projects', (req, res) => {
    const { name, repositoryUrl, teamMembers } = req.body;
    if (name && repositoryUrl && teamMembers) {
        const projectId = Math.random().toString(36).substr(2, 9); // generate a projectid
        res.status(201).json({ projectId, message: "Project successfully registered" });
        console.log("Project added successfully");
    } else {
        res.status(400).json({ message: "Invalid project data" });
    }
});

//endpoint to obtain a list of projects
app.get('/projects', (req, res) => {
    
    res.status(200).json([{ projectId: '123', name: 'Bug Tracking Application' }]);
});

// Endpoint for add-tester
app.post('/projects/:projectId/add-tester', (req, res) => {
    const { projectId } = req.params;
    const { testerEmail } = req.body;

    if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
    }
    if (!testerEmail) {
        return res.status(400).json({ message: 'Tester email is required' });
    }

    console.log(`Tester ${testerEmail} added to project ${projectId}`);
    res.status(200).json({ message: `Tester ${testerEmail} successfully added to project ${projectId}` });
});

// Endpoint to report a bug
app.post('/projects/:projectId/bugs', (req, res) => {
    const { projectId } = req.params;
    const { title, description, severity, priority, commitLink } = req.body;

    if (!projectId || !title || !description || !severity || !priority) {
        return res.status(400).json({ message: 'Invalid bug data' });
    }

    const bugId = Math.random().toString(36).substr(2, 9); // generats a random id for a bug
    console.log(`Bug ${title} reported in project ${projectId}`);
    res.status(201).json({ bugId, message: `Bug successfully reported in project ${projectId}` });
});

app.get('/projects/:projectId/bugs', (req, res) => {
    const { projectId } = req.params;

  
    const bugs = [
        { bugId: 'bug1', title: 'Login Issue', severity: 'High', status: 'Open' },
        { bugId: 'bug2', title: 'Registration form not submitting', severity: 'Medium', status: 'In Progress' }
    ];

    console.log(`Listing bugs for project ${projectId}`);
    res.status(200).json(bugs);
});


app.put('/projects/:projectId/bugs/:bugId/assign', (req, res) => {
    const { projectId, bugId } = req.params;
    const { assignee } = req.body;

    if (!projectId || !bugId || !assignee) {
        return res.status(400).json({ message: 'Invalid assignment data' });
    }

    console.log(`Bug ${bugId} in project ${projectId} assigned to ${assignee}`);
    res.status(200).json({ message: `Bug ${bugId} successfully assigned to ${assignee} in project ${projectId}` });
});

app.put('/projects/:projectId/bugs/:bugId/resolve', (req, res) => {
    const { projectId, bugId } = req.params;
    const { status, resolutionCommitLink } = req.body;

    if (!projectId || !bugId || !status) {
        return res.status(400).json({ message: 'Invalid resolution data' });
    }

    if (status !== 'Resolved') {
        return res.status(400).json({ message: 'Invalid status value, should be "Resolved"' });
    }

    console.log(`Bug ${bugId} in project ${projectId} resolved`);
    res.status(200).json({ message: `Bug ${bugId} successfully resolved in project ${projectId}`, resolutionCommitLink });
});

//startup sv
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
});
