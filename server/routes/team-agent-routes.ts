import express, { Request, Response, Router } from "express";
import { IStorage } from "../storage";
import { 
  insertTeamMemberSchema, 
  insertTeamTaskSchema as insertTaskSchema, 
  insertTaskCommentSchema,
  insertTeamCollaborationSessionSchema,
  insertTeamFeedbackSchema,
  insertTeamKnowledgeBaseItemSchema
} from "@shared/schema";
import { TeamAgentService } from "../services/team-agent-service";
import { z } from "zod";

export function createTeamAgentRoutes(storage: IStorage, teamAgentService: TeamAgentService): Router {
  const router = express.Router();

  // Team Member Routes
  router.get("/members", async (req: Request, res: Response) => {
    try {
      const members = await storage.getAllTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  router.get("/members/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const member = await storage.getTeamMemberById(id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error(`Error fetching team member:`, error);
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });

  router.get("/members/role/:role", async (req: Request, res: Response) => {
    try {
      const role = req.params.role;
      const members = await storage.getTeamMembersByRole(role);
      res.json(members);
    } catch (error) {
      console.error(`Error fetching team members by role:`, error);
      res.status(500).json({ message: "Failed to fetch team members by role" });
    }
  });

  router.post("/members", async (req: Request, res: Response) => {
    try {
      const validation = insertTeamMemberSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid team member data", 
          errors: validation.error.errors 
        });
      }

      const newMember = await storage.createTeamMember(validation.data);
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  router.patch("/members/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const member = await storage.getTeamMemberById(id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const updatedMember = await storage.updateTeamMember(id, req.body);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  router.patch("/members/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const statusSchema = z.object({ status: z.string() });
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid status", 
          errors: validation.error.errors 
        });
      }

      const member = await storage.updateTeamMemberStatus(id, validation.data.status);
      res.json(member);
    } catch (error) {
      console.error("Error updating team member status:", error);
      res.status(500).json({ message: "Failed to update team member status" });
    }
  });

  router.delete("/members/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const success = await storage.deleteTeamMember(id);
      if (!success) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Team Task Routes
  router.get("/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTeamTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching team tasks:", error);
      res.status(500).json({ message: "Failed to fetch team tasks" });
    }
  });

  router.get("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const task = await storage.getTeamTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error(`Error fetching task:`, error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  router.get("/tasks/assignee/:assigneeId", async (req: Request, res: Response) => {
    try {
      const assigneeId = parseInt(req.params.assigneeId);
      if (isNaN(assigneeId)) {
        return res.status(400).json({ message: "Invalid assignee ID format" });
      }

      const tasks = await storage.getTeamTasksByAssignee(assigneeId);
      res.json(tasks);
    } catch (error) {
      console.error(`Error fetching tasks by assignee:`, error);
      res.status(500).json({ message: "Failed to fetch tasks by assignee" });
    }
  });

  router.get("/tasks/status/:status", async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      const tasks = await storage.getTeamTasksByStatus(status);
      res.json(tasks);
    } catch (error) {
      console.error(`Error fetching tasks by status:`, error);
      res.status(500).json({ message: "Failed to fetch tasks by status" });
    }
  });

  router.post("/tasks", async (req: Request, res: Response) => {
    try {
      const validation = insertTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: validation.error.errors 
        });
      }

      const newTask = await storage.createTeamTask(validation.data);
      res.status(201).json(newTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  router.patch("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const task = await storage.getTeamTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updatedTask = await storage.updateTeamTask(req.params.id, req.body);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  router.patch("/tasks/:id/status", async (req: Request, res: Response) => {
    try {
      const statusSchema = z.object({ status: z.string() });
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid status", 
          errors: validation.error.errors 
        });
      }

      const task = await storage.updateTeamTaskStatus(req.params.id, validation.data.status);
      res.json(task);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  router.patch("/tasks/:id/assign/:memberId", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.memberId);
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid member ID format" });
      }

      const task = await storage.assignTeamTask(req.params.id, memberId);
      res.json(task);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  router.delete("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteTeamTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task Comment Routes
  router.get("/tasks/:taskId/comments", async (req: Request, res: Response) => {
    try {
      const comments = await storage.getTaskCommentsByTaskId(req.params.taskId);
      res.json(comments);
    } catch (error) {
      console.error(`Error fetching task comments:`, error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  router.post("/tasks/:taskId/comments", async (req: Request, res: Response) => {
    try {
      const validation = insertTaskCommentSchema.safeParse({
        ...req.body,
        taskId: req.params.taskId
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid comment data", 
          errors: validation.error.errors 
        });
      }

      const newComment = await storage.createTaskComment(validation.data);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  // Team Collaboration Session Routes
  router.get("/collaboration-sessions", async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getAllTeamCollaborationSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching collaboration sessions:", error);
      res.status(500).json({ message: "Failed to fetch collaboration sessions" });
    }
  });

  router.post("/collaboration-sessions", async (req: Request, res: Response) => {
    try {
      const validation = insertTeamCollaborationSessionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid collaboration session data", 
          errors: validation.error.errors 
        });
      }

      const newSession = await storage.createTeamCollaborationSession(validation.data);
      res.status(201).json(newSession);
    } catch (error) {
      console.error("Error creating collaboration session:", error);
      res.status(500).json({ message: "Failed to create collaboration session" });
    }
  });

  // Team feedback routes
  router.get("/feedback", async (req: Request, res: Response) => {
    try {
      const feedback = await storage.getAllTeamFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching team feedback:", error);
      res.status(500).json({ message: "Failed to fetch team feedback" });
    }
  });

  router.post("/feedback", async (req: Request, res: Response) => {
    try {
      const validation = insertTeamFeedbackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid feedback data", 
          errors: validation.error.errors 
        });
      }

      const newFeedback = await storage.createTeamFeedback(validation.data);
      res.status(201).json(newFeedback);
    } catch (error) {
      console.error("Error creating team feedback:", error);
      res.status(500).json({ message: "Failed to create team feedback" });
    }
  });

  // Team Knowledge Base Routes
  router.get("/knowledge-base", async (req: Request, res: Response) => {
    try {
      const items = await storage.getAllTeamKnowledgeBaseItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching knowledge base items:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base items" });
    }
  });

  router.post("/knowledge-base", async (req: Request, res: Response) => {
    try {
      const validation = insertTeamKnowledgeBaseItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid knowledge base item data", 
          errors: validation.error.errors 
        });
      }

      const newItem = await storage.createTeamKnowledgeBaseItem(validation.data);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating knowledge base item:", error);
      res.status(500).json({ message: "Failed to create knowledge base item" });
    }
  });
  
  // Team agent operations routes
  router.post("/generate-solution", async (req: Request, res: Response) => {
    try {
      const { taskId, prompt } = req.body;
      
      if (!taskId || !prompt) {
        return res.status(400).json({ 
          message: "Invalid request, taskId and prompt are required" 
        });
      }
      
      const solution = await teamAgentService.generateSolution(taskId, prompt);
      res.json({ solution });
    } catch (error) {
      console.error("Error generating solution:", error);
      res.status(500).json({ message: "Failed to generate solution" });
    }
  });

  router.post("/code-review", async (req: Request, res: Response) => {
    try {
      const { taskId, code } = req.body;
      
      if (!taskId || !code) {
        return res.status(400).json({ 
          message: "Invalid request, taskId and code are required" 
        });
      }
      
      const review = await teamAgentService.performCodeReview(taskId, code);
      res.json({ review });
    } catch (error) {
      console.error("Error performing code review:", error);
      res.status(500).json({ message: "Failed to perform code review" });
    }
  });

  router.post("/design-feedback", async (req: Request, res: Response) => {
    try {
      const { taskId, designDescription } = req.body;
      
      if (!taskId || !designDescription) {
        return res.status(400).json({ 
          message: "Invalid request, taskId and designDescription are required" 
        });
      }
      
      const feedback = await teamAgentService.getDesignFeedback(taskId, designDescription);
      res.json({ feedback });
    } catch (error) {
      console.error("Error getting design feedback:", error);
      res.status(500).json({ message: "Failed to get design feedback" });
    }
  });

  router.post("/compliance-check", async (req: Request, res: Response) => {
    try {
      const { taskId, propertyData } = req.body;
      
      if (!taskId || !propertyData) {
        return res.status(400).json({ 
          message: "Invalid request, taskId and propertyData are required" 
        });
      }
      
      const complianceReport = await teamAgentService.performComplianceCheck(taskId, propertyData);
      res.json({ complianceReport });
    } catch (error) {
      console.error("Error performing compliance check:", error);
      res.status(500).json({ message: "Failed to perform compliance check" });
    }
  });

  return router;
}