import { Response } from 'express';
import { TeamService } from '@server/db/services';
import { userService } from '@server/db/services';
import {
  insertTeamSchema,
  inviteMemberSchema,
  updateMemberSchema,
  updateTeamSchema,
} from '@shared/types';
import { AuthenticatedRequest } from '@server/types';
import { z } from 'zod';

export class TeamController {
  static async createTeam(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const user = req.user;
      if (!userId || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = insertTeamSchema.parse(req.body);

      try {
        const team = await TeamService.createTeam(validatedData, userId);

        // Return team with user role and permissions (owner has all permissions)
        const teamWithUserRole = {
          ...team,
          owner: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
          },
          userRole: 'owner' as const,
          userPermissions: [
            'create_campaign',
            'edit_campaign',
            'delete_campaign',
            'view_campaign',
            'create_ad',
            'edit_ad',
            'delete_ad',
            'view_ad',
            'manage_team',
          ] as const,
        };

        res.status(201).json({ team: teamWithUserRole });
      } catch (teamError: any) {
        if (teamError.message.includes('Maximum team limit reached')) {
          return res.status(400).json({
            error: teamError.message,
            code: 'TEAM_LIMIT_EXCEEDED',
          });
        }
        throw teamError;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error creating team:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserTeamStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await TeamService.getUserTeamStats(userId);
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching team stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserTeams(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const teams = await TeamService.getUserTeams(userId);
      res.json({ teams });
    } catch (error) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTeamById(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is a member of the team
      const membership = await TeamService.getUserTeamMembership(teamId, userId);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const team = await TeamService.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      res.json({ team });
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async inviteMember(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has manage_team permission
      const permissionCheck = await TeamService.checkUserPermission(teamId, userId, 'manage_team');
      if (!permissionCheck.hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const validatedData = inviteMemberSchema.parse(req.body);

      // Find user by email
      const targetUser = await userService.getUserByEmail(validatedData.email);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user is already a member
      const existingMembership = await TeamService.getUserTeamMembership(teamId, targetUser.id);
      if (existingMembership) {
        return res.status(400).json({ error: 'User is already a team member' });
      }

      try {
        // Add member to team (will enforce member limit inside service)
        const member = await TeamService.addTeamMember({
          teamId,
          userId: targetUser.id,
          role: validatedData.role,
          permissions: validatedData.permissions,
        });
        res.status(201).json({ member });
      } catch (e: any) {
        if (e.message?.includes('Maximum members limit')) {
          return res.status(400).json({
            error: e.message,
            code: 'TEAM_MEMBER_LIMIT_EXCEEDED',
          });
        }
        throw e;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error inviting member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTeamMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is a member of the team
      const membership = await TeamService.getUserTeamMembership(teamId, userId);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const members = await TeamService.getTeamMembers(teamId);
      res.json({ members });
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateMember(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const targetUserId = parseInt(req.params.userId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has manage_team permission
      const permissionCheck = await TeamService.checkUserPermission(teamId, userId, 'manage_team');
      if (!permissionCheck.hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Cannot modify team owner
      const targetMembership = await TeamService.getUserTeamMembership(teamId, targetUserId);
      if (!targetMembership) {
        return res.status(404).json({ error: 'Team member not found' });
      }

      if (targetMembership.role === 'owner') {
        return res.status(400).json({ error: 'Cannot modify team owner' });
      }

      const validatedData = updateMemberSchema.parse(req.body);
      const updatedMember = await TeamService.updateTeamMember(teamId, targetUserId, validatedData);

      res.json({ member: updatedMember });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error updating member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const targetUserId = parseInt(req.params.userId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has manage_team permission
      const permissionCheck = await TeamService.checkUserPermission(teamId, userId, 'manage_team');
      if (!permissionCheck.hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Cannot remove team owner
      const targetMembership = await TeamService.getUserTeamMembership(teamId, targetUserId);
      if (!targetMembership) {
        return res.status(404).json({ error: 'Team member not found' });
      }

      if (targetMembership.role === 'owner') {
        return res.status(400).json({ error: 'Cannot remove team owner' });
      }

      await TeamService.removeTeamMember(teamId, targetUserId);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async checkPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const targetUserId = parseInt(req.params.userId);
      const permission = req.query.permission as string;

      if (permission) {
        // Check specific permission
        const result = await TeamService.checkUserPermission(
          teamId,
          targetUserId,
          permission as any
        );
        res.json(result);
      } else {
        // Get all user permissions and role
        const result = await TeamService.getUserPermissionsInTeam(teamId, targetUserId);
        res.json(result);
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateTeam(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has manage_team permission
      const permissionCheck = await TeamService.checkUserPermission(teamId, userId, 'manage_team');
      if (!permissionCheck.hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const validatedData = updateTeamSchema.parse(req.body);
      const updatedTeam = await TeamService.updateTeam(teamId, validatedData);

      res.json({ team: updatedTeam });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteTeam(req: AuthenticatedRequest, res: Response) {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure user is owner (only owners can delete teams)
      const membership = await TeamService.getUserTeamMembership(teamId, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ error: 'Only team owner can delete the team' });
      }

      await TeamService.deleteTeam(teamId);
      res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
