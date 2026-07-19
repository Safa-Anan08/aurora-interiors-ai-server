import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const dataFilePath = path.join(__dirname, '../../data/projects.json');

// Helper to ensure data directory and file exist
function ensureDataFile() {
  const dirPath = path.dirname(dataFilePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }
}

interface Project {
  id: string;
  name: string;
  roomType: string;
  style: string;
  imageUrl: string;
  prompt?: string;
  createdAt: string;
}

// Read projects
function readProjects(): Project[] {
  ensureDataFile();
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data) as Project[];
  } catch (err) {
    console.error('Error reading projects database:', err);
    return [];
  }
}

// Write projects
function writeProjects(projects: Project[]) {
  ensureDataFile();
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Error writing projects database:', err);
  }
}

// Get all projects
router.get('/', (req: Request, res: Response) => {
  const projects = readProjects();
  // Return sorted newest first
  const sorted = projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.status(200).json(sorted);
});

// Save a new project
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, roomType, style, imageUrl, prompt } = req.body;

    if (!name || !roomType || !style || !imageUrl) {
      return res.status(400).json({ error: { message: 'Name, roomType, style, and imageUrl are required.' } });
    }

    const projects = readProjects();
    const newProject: Project = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      roomType,
      style,
      imageUrl,
      prompt,
      createdAt: new Date().toISOString()
    };

    projects.push(newProject);
    writeProjects(projects);

    res.status(201).json({ success: true, project: newProject });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to save project' } });
  }
});

// Delete a project
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let projects = readProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: { message: 'Project not found.' } });
    }

    projects.splice(index, 1);
    writeProjects(projects);

    res.status(200).json({ success: true, message: 'Project deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to delete project' } });
  }
});

export default router;
