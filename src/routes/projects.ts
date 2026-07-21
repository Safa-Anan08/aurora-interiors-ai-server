import { Router, Request, Response } from 'express';
import Project from '../models/Project';

const router = Router();

// Get all projects from MongoDB
router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    const formatted = projects.map(p => ({
      id: p._id.toString(),
      name: p.name,
      roomType: p.roomType,
      style: p.style,
      imageUrl: p.imageUrl,
      prompt: p.prompt,
      createdAt: p.createdAt.toISOString()
    }));
    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to retrieve projects' } });
  }
});

// Save a new project to MongoDB
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, roomType, style, imageUrl, prompt } = req.body;

    if (!name || !roomType || !style || !imageUrl) {
      return res.status(400).json({ error: { message: 'Name, roomType, style, and imageUrl are required.' } });
    }

    const newProject = new Project({
      name,
      roomType,
      style,
      imageUrl,
      prompt
    });
    await newProject.save();

    res.status(201).json({
      success: true,
      project: {
        id: newProject._id.toString(),
        name: newProject.name,
        roomType: newProject.roomType,
        style: newProject.style,
        imageUrl: newProject.imageUrl,
        prompt: newProject.prompt,
        createdAt: newProject.createdAt.toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to save project' } });
  }
});

// Delete a project from MongoDB
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Support both MongoDB ObjectId and string ID lookup
    const deleted = await Project.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: { message: 'Project not found.' } });
    }

    res.status(200).json({ success: true, message: 'Project deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to delete project' } });
  }
});

export default router;
