import type { Express } from 'express';
import { TeamController } from '@server/controllers';
import { authenticate, requirePermission } from '@server/middleware/auth.middleware';
import campaignRoutes from './campaign.routes';

export function registerTeamRoutes(app: Express): void {
  // Team management routes
  app.post('/api/teams', authenticate, TeamController.createTeam);
  app.get('/api/teams/user-teams', authenticate, TeamController.getUserTeams);
  app.get('/api/teams/stats', authenticate, TeamController.getUserTeamStats);
  app.get('/api/teams/:teamId', authenticate, TeamController.getTeamById);
  app.put(
    '/api/teams/:teamId',
    authenticate,
    requirePermission('manage_team'),
    TeamController.updateTeam
  );
  app.delete('/api/teams/:teamId', authenticate, TeamController.deleteTeam);

  // Team member management routes
  app.post(
    '/api/teams/:teamId/members',
    authenticate,
    requirePermission('manage_team'),
    TeamController.inviteMember
  );
  app.get('/api/teams/:teamId/members', authenticate, TeamController.getTeamMembers);
  app.put(
    '/api/teams/:teamId/members/:userId',
    authenticate,
    requirePermission('manage_team'),
    TeamController.updateMember
  );
  app.delete(
    '/api/teams/:teamId/members/:userId',
    authenticate,
    requirePermission('manage_team'),
    TeamController.removeMember
  );

  // Permission check route
  app.get('/api/teams/:teamId/permissions/:userId', authenticate, TeamController.checkPermission);

  // Campaign and ads routes
  app.use('/api', campaignRoutes);
}
