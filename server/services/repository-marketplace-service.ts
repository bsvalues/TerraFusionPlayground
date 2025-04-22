import { IStorage } from '../storage';
import {
  Repository,
  InsertRepository,
  RepositoryVersion,
  InsertRepositoryVersion,
  RepositoryReview,
  InsertRepositoryReview,
  RepositoryDependency,
  InsertRepositoryDependency,
  RepositoryType,
  RepositoryVisibility,
  RepositoryLicense
} from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

/**
 * Service for managing the TerraFusion Repository Marketplace
 */
export class RepositoryMarketplaceService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get all repositories with optional filters
   */
  async getRepositories(filters?: {
    repositoryType?: string;
    visibility?: string; 
    tags?: string[];
    featured?: boolean;
    search?: string;
  }): Promise<Repository[]> {
    const repositories = await this.storage.getRepositories(filters);
    
    // If search term is provided, filter repositories by name or description
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      return repositories.filter(repo => 
        repo.name.toLowerCase().includes(searchTerm) || 
        repo.displayName.toLowerCase().includes(searchTerm) || 
        (repo.description && repo.description.toLowerCase().includes(searchTerm))
      );
    }
    
    return repositories;
  }

  /**
   * Get repository by ID
   */
  async getRepositoryById(id: number): Promise<Repository | undefined> {
    return this.storage.getRepositoryById(id);
  }

  /**
   * Get repository by name
   */
  async getRepositoryByName(name: string): Promise<Repository | undefined> {
    return this.storage.getRepositoryByName(name);
  }

  /**
   * Create a new repository
   */
  async createRepository(repository: InsertRepository, userId: number): Promise<Repository> {
    // Ensure owner ID is set
    const repoWithOwner = { ...repository, ownerId: userId };
    return this.storage.createRepository(repoWithOwner);
  }

  /**
   * Update a repository
   */
  async updateRepository(id: number, updates: Partial<InsertRepository>, userId: number): Promise<Repository | undefined> {
    // Check if user owns the repository
    const repo = await this.storage.getRepositoryById(id);
    if (!repo) {
      return undefined;
    }

    if (repo.ownerId !== userId) {
      throw new Error('Unauthorized: You do not have permission to update this repository');
    }

    return this.storage.updateRepository(id, updates);
  }

  /**
   * Delete a repository
   */
  async deleteRepository(id: number, userId: number): Promise<boolean> {
    // Check if user owns the repository
    const repo = await this.storage.getRepositoryById(id);
    if (!repo) {
      return false;
    }

    if (repo.ownerId !== userId) {
      throw new Error('Unauthorized: You do not have permission to delete this repository');
    }

    return this.storage.deleteRepository(id);
  }

  /**
   * Star a repository
   */
  async starRepository(id: number): Promise<Repository | undefined> {
    return this.storage.incrementRepositoryStars(id);
  }

  /**
   * Fork a repository
   */
  async forkRepository(id: number, userId: number): Promise<Repository | undefined> {
    const sourceRepo = await this.storage.getRepositoryById(id);
    if (!sourceRepo) {
      return undefined;
    }

    // Increment the fork count on the source repository
    await this.storage.incrementRepositoryForks(id);

    // Create a new repository as a fork of the source
    const forkedRepo: InsertRepository = {
      name: `${sourceRepo.name}-fork-${userId}`,
      displayName: `${sourceRepo.displayName} (Fork)`,
      description: sourceRepo.description ? `Fork of: ${sourceRepo.description}` : 'Fork of ' + sourceRepo.displayName,
      readmeContent: sourceRepo.readmeContent,
      repositoryType: sourceRepo.repositoryType as RepositoryType,
      visibility: 'private' as RepositoryVisibility, // Forks are private by default
      license: sourceRepo.license as RepositoryLicense,
      gitUrl: sourceRepo.gitUrl,
      websiteUrl: sourceRepo.websiteUrl,
      logoUrl: sourceRepo.logoUrl,
      ownerId: userId,
      organizationId: null,
      tags: sourceRepo.tags
    };

    const newRepo = await this.storage.createRepository(forkedRepo);

    // TODO: Copy repository contents and versions (can be implemented later)

    return newRepo;
  }

  /**
   * Get repositories by owner
   */
  async getRepositoriesByOwner(ownerId: number): Promise<Repository[]> {
    return this.storage.getRepositoriesByOwner(ownerId);
  }

  /**
   * Get featured repositories
   */
  async getFeaturedRepositories(): Promise<Repository[]> {
    return this.storage.getFeaturedRepositories();
  }

  /**
   * Create a new repository version
   */
  async createRepositoryVersion(repositoryId: number, version: InsertRepositoryVersion, userId: number): Promise<RepositoryVersion | undefined> {
    // Check if user owns the repository
    const repo = await this.storage.getRepositoryById(repositoryId);
    if (!repo) {
      return undefined;
    }

    if (repo.ownerId !== userId) {
      throw new Error('Unauthorized: You do not have permission to create versions for this repository');
    }

    // Check if version already exists
    const existingVersion = await this.storage.getRepositoryVersionByVersion(repositoryId, version.version);
    if (existingVersion) {
      throw new Error(`Version ${version.version} already exists for this repository`);
    }

    // Set published by user ID
    const versionWithPublisher = { ...version, publishedBy: userId };
    
    // Create the version
    const newVersion = await this.storage.createRepositoryVersion(versionWithPublisher);
    
    // If it's marked as latest, update other versions
    if (newVersion.isLatest) {
      await this.setVersionAsLatest(newVersion.id);
    }
    
    return newVersion;
  }

  /**
   * Get versions for a repository
   */
  async getRepositoryVersions(repositoryId: number): Promise<RepositoryVersion[]> {
    return this.storage.getRepositoryVersions(repositoryId);
  }

  /**
   * Get the latest version of a repository
   */
  async getLatestRepositoryVersion(repositoryId: number): Promise<RepositoryVersion | undefined> {
    return this.storage.getLatestRepositoryVersion(repositoryId);
  }

  /**
   * Set a version as the latest for a repository
   */
  async setVersionAsLatest(versionId: number): Promise<RepositoryVersion | undefined> {
    return this.storage.setRepositoryVersionAsLatest(versionId);
  }

  /**
   * Add a review to a repository
   */
  async createRepositoryReview(repositoryId: number, review: InsertRepositoryReview, userId: number): Promise<RepositoryReview | undefined> {
    // Check if repository exists
    const repo = await this.storage.getRepositoryById(repositoryId);
    if (!repo) {
      return undefined;
    }

    // Check if user has already reviewed this repository
    const userReviews = await this.storage.getRepositoryReviewsByUser(userId);
    const existingReview = userReviews.find(r => r.repositoryId === repositoryId);
    
    if (existingReview) {
      // Update existing review instead
      return this.storage.updateRepositoryReview(existingReview.id, review);
    }

    // Set the user ID
    const reviewWithUser = { ...review, userId };
    
    // Create the review
    return this.storage.createRepositoryReview(reviewWithUser);
  }

  /**
   * Get reviews for a repository
   */
  async getRepositoryReviews(repositoryId: number): Promise<RepositoryReview[]> {
    return this.storage.getRepositoryReviews(repositoryId);
  }

  /**
   * Get average rating for a repository
   */
  async getRepositoryAverageRating(repositoryId: number): Promise<number> {
    return this.storage.getRepositoryAverageRating(repositoryId);
  }

  /**
   * Get dependencies for a repository
   */
  async getRepositoryDependencies(repositoryId: number): Promise<RepositoryDependency[]> {
    return this.storage.getRepositoryDependencies(repositoryId);
  }

  /**
   * Add a dependency to a repository
   */
  async addRepositoryDependency(dependency: InsertRepositoryDependency, userId: number): Promise<RepositoryDependency | undefined> {
    // Check if user owns the repository
    const repo = await this.storage.getRepositoryById(dependency.repositoryId);
    if (!repo) {
      return undefined;
    }

    if (repo.ownerId !== userId) {
      throw new Error('Unauthorized: You do not have permission to add dependencies to this repository');
    }

    // Create the dependency
    return this.storage.createRepositoryDependency(dependency);
  }

  /**
   * Remove a dependency from a repository
   */
  async removeRepositoryDependency(id: number, userId: number): Promise<boolean> {
    // Check if user owns the repository
    const dependency = await this.storage.getRepositoryDependency(id);
    if (!dependency) {
      return false;
    }

    const repo = await this.storage.getRepositoryById(dependency.repositoryId);
    if (!repo) {
      return false;
    }

    if (repo.ownerId !== userId) {
      throw new Error('Unauthorized: You do not have permission to remove dependencies from this repository');
    }

    return this.storage.deleteRepositoryDependency(id);
  }

  /**
   * Find repositories that depend on a given repository
   */
  async findDependentRepositories(repositoryId: number): Promise<Repository[]> {
    const dependencies = await this.storage.getDependentRepositories(repositoryId);
    
    // Get the actual repositories
    const repositories: Repository[] = [];
    for (const dependency of dependencies) {
      const repo = await this.storage.getRepositoryById(dependency.repositoryId);
      if (repo) {
        repositories.push(repo);
      }
    }
    
    return repositories;
  }
}