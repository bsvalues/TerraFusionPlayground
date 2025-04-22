import express from 'express';
import { RepositoryMarketplaceService } from '../services/repository-marketplace-service';
import { IStorage } from '../storage';
import { z } from 'zod';
import { RepositoryType, RepositoryVisibility, RepositoryLicense } from '@shared/schema';

// Create a new router
const router = express.Router();

// Schema for repository creation and update
const repositorySchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Name must contain only lowercase letters, numbers, and hyphens'),
  displayName: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  readmeContent: z.string().max(50000).optional(),
  repositoryType: z.nativeEnum(RepositoryType),
  visibility: z.nativeEnum(RepositoryVisibility).default('private'),
  license: z.nativeEnum(RepositoryLicense).default('mit'),
  gitUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  organizationId: z.number().optional().nullable(),
  tags: z.array(z.string()).optional()
});

// Schema for repository version creation
const repositoryVersionSchema = z.object({
  repositoryId: z.number(),
  version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  releaseNotes: z.string().max(10000).optional(),
  commitHash: z.string().optional(),
  compatibilityInfo: z.any().optional(),
  downloadUrl: z.string().url().optional(),
  isLatest: z.boolean().default(false),
  isStable: z.boolean().default(true)
});

// Schema for repository review creation
const repositoryReviewSchema = z.object({
  repositoryId: z.number(),
  rating: z.number().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
  versionUsed: z.string().optional()
});

// Schema for repository dependency creation
const repositoryDependencySchema = z.object({
  repositoryId: z.number(),
  dependencyRepoId: z.number(),
  versionRange: z.string(),
  dependencyType: z.string().default('runtime')
});

export default function createRepositoryMarketplaceRoutes(storage: IStorage) {
  const repositoryService = new RepositoryMarketplaceService(storage);

  // GET /api/repositories - List all repositories with filters
  router.get('/', async (req, res) => {
    try {
      const filters = {
        repositoryType: req.query.type as string,
        visibility: req.query.visibility as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        featured: req.query.featured === 'true',
        search: req.query.search as string
      };

      const repositories = await repositoryService.getRepositories(filters);
      res.json(repositories);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  });

  // GET /api/repositories/featured - Get featured repositories
  router.get('/featured', async (req, res) => {
    try {
      const repositories = await repositoryService.getFeaturedRepositories();
      res.json(repositories);
    } catch (error) {
      console.error('Error fetching featured repositories:', error);
      res.status(500).json({ error: 'Failed to fetch featured repositories' });
    }
  });

  // GET /api/repositories/user/:userId - Get repositories by owner
  router.get('/user/:userId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.userId);
      const repositories = await repositoryService.getRepositoriesByOwner(ownerId);
      res.json(repositories);
    } catch (error) {
      console.error('Error fetching user repositories:', error);
      res.status(500).json({ error: 'Failed to fetch user repositories' });
    }
  });

  // GET /api/repositories/:id - Get repository by ID
  router.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await repositoryService.getRepositoryById(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      res.json(repository);
    } catch (error) {
      console.error('Error fetching repository:', error);
      res.status(500).json({ error: 'Failed to fetch repository' });
    }
  });

  // GET /api/repositories/name/:name - Get repository by name
  router.get('/name/:name', async (req, res) => {
    try {
      const name = req.params.name;
      const repository = await repositoryService.getRepositoryByName(name);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      res.json(repository);
    } catch (error) {
      console.error('Error fetching repository by name:', error);
      res.status(500).json({ error: 'Failed to fetch repository' });
    }
  });

  // POST /api/repositories - Create a new repository
  router.post('/', async (req, res) => {
    try {
      // Validate request body
      const validationResult = repositorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid repository data', 
          details: validationResult.error.format() 
        });
      }
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Create repository
      const repository = await repositoryService.createRepository(validationResult.data, userId);
      
      res.status(201).json(repository);
    } catch (error) {
      console.error('Error creating repository:', error);
      res.status(500).json({ error: 'Failed to create repository' });
    }
  });

  // PUT /api/repositories/:id - Update a repository
  router.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate request body
      const validationResult = repositorySchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid repository data', 
          details: validationResult.error.format() 
        });
      }
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Update repository
      const repository = await repositoryService.updateRepository(id, validationResult.data, userId);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      res.json(repository);
    } catch (error) {
      console.error('Error updating repository:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update repository' });
    }
  });

  // DELETE /api/repositories/:id - Delete a repository
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Delete repository
      const success = await repositoryService.deleteRepository(id, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting repository:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to delete repository' });
    }
  });

  // POST /api/repositories/:id/star - Star a repository
  router.post('/:id/star', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Star repository
      const repository = await repositoryService.starRepository(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      res.json(repository);
    } catch (error) {
      console.error('Error starring repository:', error);
      res.status(500).json({ error: 'Failed to star repository' });
    }
  });

  // POST /api/repositories/:id/fork - Fork a repository
  router.post('/:id/fork', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Fork repository
      const repository = await repositoryService.forkRepository(id, userId);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      res.status(201).json(repository);
    } catch (error) {
      console.error('Error forking repository:', error);
      res.status(500).json({ error: 'Failed to fork repository' });
    }
  });

  // GET /api/repositories/:id/versions - Get versions of a repository
  router.get('/:id/versions', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get versions
      const versions = await repositoryService.getRepositoryVersions(id);
      
      res.json(versions);
    } catch (error) {
      console.error('Error fetching repository versions:', error);
      res.status(500).json({ error: 'Failed to fetch repository versions' });
    }
  });

  // GET /api/repositories/:id/versions/latest - Get latest version of a repository
  router.get('/:id/versions/latest', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get latest version
      const version = await repositoryService.getLatestRepositoryVersion(id);
      
      if (!version) {
        return res.status(404).json({ error: 'No versions found for this repository' });
      }
      
      res.json(version);
    } catch (error) {
      console.error('Error fetching latest repository version:', error);
      res.status(500).json({ error: 'Failed to fetch latest repository version' });
    }
  });

  // POST /api/repositories/:id/versions - Create a new version of a repository
  router.post('/:id/versions', async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      
      // Validate request body
      const validationResult = repositoryVersionSchema.omit({ repositoryId: true }).safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid version data', 
          details: validationResult.error.format() 
        });
      }
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(repositoryId);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Create version
      const version = await repositoryService.createRepositoryVersion(
        repositoryId,
        { ...validationResult.data, repositoryId },
        userId
      );
      
      if (!version) {
        return res.status(404).json({ error: 'Failed to create version' });
      }
      
      res.status(201).json(version);
    } catch (error) {
      console.error('Error creating repository version:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create repository version' });
    }
  });

  // GET /api/repositories/:id/reviews - Get reviews of a repository
  router.get('/:id/reviews', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get reviews
      const reviews = await repositoryService.getRepositoryReviews(id);
      
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching repository reviews:', error);
      res.status(500).json({ error: 'Failed to fetch repository reviews' });
    }
  });

  // POST /api/repositories/:id/reviews - Create a review for a repository
  router.post('/:id/reviews', async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      
      // Validate request body
      const validationResult = repositoryReviewSchema.omit({ repositoryId: true }).safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid review data', 
          details: validationResult.error.format() 
        });
      }
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(repositoryId);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Create review
      const review = await repositoryService.createRepositoryReview(
        repositoryId,
        { ...validationResult.data, repositoryId },
        userId
      );
      
      if (!review) {
        return res.status(404).json({ error: 'Failed to create review' });
      }
      
      res.status(201).json(review);
    } catch (error) {
      console.error('Error creating repository review:', error);
      res.status(500).json({ error: 'Failed to create repository review' });
    }
  });

  // GET /api/repositories/:id/dependencies - Get dependencies of a repository
  router.get('/:id/dependencies', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get dependencies
      const dependencies = await repositoryService.getRepositoryDependencies(id);
      
      res.json(dependencies);
    } catch (error) {
      console.error('Error fetching repository dependencies:', error);
      res.status(500).json({ error: 'Failed to fetch repository dependencies' });
    }
  });

  // POST /api/repositories/:id/dependencies - Add a dependency to a repository
  router.post('/:id/dependencies', async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      
      // Validate request body
      const validationResult = repositoryDependencySchema.omit({ repositoryId: true }).safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid dependency data', 
          details: validationResult.error.format() 
        });
      }
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(repositoryId);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Add dependency
      const dependency = await repositoryService.addRepositoryDependency(
        { ...validationResult.data, repositoryId },
        userId
      );
      
      if (!dependency) {
        return res.status(404).json({ error: 'Failed to add dependency' });
      }
      
      res.status(201).json(dependency);
    } catch (error) {
      console.error('Error adding repository dependency:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to add repository dependency' });
    }
  });

  // DELETE /api/repositories/dependencies/:id - Delete a dependency
  router.delete('/dependencies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get user ID from request (assuming authentication middleware sets this)
      const userId = req.body.userId || 1; // Default to user 1 for now
      
      // Remove dependency
      const success = await repositoryService.removeRepositoryDependency(id, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Dependency not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error removing repository dependency:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to remove repository dependency' });
    }
  });

  // GET /api/repositories/:id/dependents - Get repositories that depend on this one
  router.get('/:id/dependents', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if repository exists
      const repository = await repositoryService.getRepositoryById(id);
      
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      // Get dependent repositories
      const dependents = await repositoryService.findDependentRepositories(id);
      
      res.json(dependents);
    } catch (error) {
      console.error('Error fetching dependent repositories:', error);
      res.status(500).json({ error: 'Failed to fetch dependent repositories' });
    }
  });

  return router;
}