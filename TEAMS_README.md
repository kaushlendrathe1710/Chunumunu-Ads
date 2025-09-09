# Teams, Roles, and Permissions Feature

This document explains the comprehensive teams, roles, and permissions system implemented in the Chunumunu Ads Platform.

## Overview

The teams feature allows users to:
- Create and manage teams
- Invite members with specific roles and permissions
- Control access to campaigns and ads based on team membership
- Manage granular permissions for different actions

## Database Schema

### Core Tables

1. **teams** - Team information
   - `id` - Primary key
   - `name` - Team name
   - `description` - Optional team description
   - `avatar` - Optional team avatar URL
   - `ownerId` - Reference to the team owner (users.id)
   - `createdAt`, `updatedAt` - Timestamps

2. **team_members** - Team membership with roles and permissions
   - `id` - Primary key
   - `teamId` - Reference to team
   - `userId` - Reference to user
   - `role` - Team role enum (owner, admin, member, viewer)
   - `permissions` - Array of permission enums
   - `joinedAt`, `updatedAt` - Timestamps

3. **campaigns** - Campaigns belong to teams
   - `teamId` - Reference to team
   - `createdBy` - Reference to user who created it

4. **ads** - Ads belong to campaigns (and indirectly to teams)
   - `campaignId` - Reference to campaign
   - `createdBy` - Reference to user who created it

### Enums

1. **team_role**
   - `owner` - Team owner (full permissions)
   - `admin` - Team admin (manage_team + specified permissions)
   - `member` - Regular member (only specified permissions)
   - `viewer` - View-only member (only specified permissions)

2. **permission**
   - `create_campaign` - Can create campaigns
   - `edit_campaign` - Can edit campaigns
   - `delete_campaign` - Can delete campaigns
   - `view_campaign` - Can view campaigns
   - `create_ad` - Can create ads
   - `edit_ad` - Can edit ads
   - `delete_ad` - Can delete ads
   - `view_ad` - Can view ads
   - `manage_team` - Can manage team members

## Permission System

### Role-Based Permissions

1. **Owner**
   - Has all permissions automatically
   - Cannot be removed from team
   - Can transfer ownership (not implemented yet)

2. **Admin**
   - Always has `manage_team` permission
   - Gets additional permissions from the `permissions[]` array

3. **Member/Viewer**
   - Only gets permissions explicitly listed in `permissions[]`
   - No automatic permissions

### Permission Checking Logic

```typescript
// Backend - TeamService.checkUserPermission()
if (role === 'owner') {
  return { hasPermission: true };
}

if (role === 'admin') {
  const hasPermission = permission === 'manage_team' || permissions.includes(permission);
  return { hasPermission };
}

// Member/Viewer
const hasPermission = permissions.includes(permission);
return { hasPermission };
```

## Backend API

### Team Routes

- `POST /api/teams` - Create team
- `GET /api/teams/user-teams` - Get user's teams
- `GET /api/teams/:teamId` - Get team details
- `PUT /api/teams/:teamId` - Update team (requires manage_team)

### Member Routes

- `POST /api/teams/:teamId/members` - Invite member (requires manage_team)
- `GET /api/teams/:teamId/members` - List team members
- `PUT /api/teams/:teamId/members/:userId` - Update member (requires manage_team)
- `DELETE /api/teams/:teamId/members/:userId` - Remove member (requires manage_team)

### Permission Route

- `GET /api/teams/:teamId/permissions/:userId?permission=PERMISSION` - Check permission

### Middleware

```typescript
// Protect routes that require specific permissions
app.get('/api/campaigns', authenticate, requirePermission('view_campaign'), CampaignController.list);
app.post('/api/campaigns', authenticate, requirePermission('create_campaign'), CampaignController.create);
```

## Frontend Components

### Core Components

1. **TeamSelector** - Dropdown to switch between teams
2. **CreateTeamModal** - Modal to create new teams
3. **TeamMembersManager** - Manage team members and their permissions
4. **PermissionGuard** - Conditional rendering based on permissions

### Redux State Management

The team state is managed using Redux Toolkit with the following slices:

```typescript
interface TeamState {
  teams: TeamWithOwner[];
  currentTeam: TeamWithOwner | null;
  teamMembers: TeamMemberWithUser[];
  userPermissions: Permission[];
  userRole: TeamRole | null;
  loading: boolean;
  error: string | null;
}
```

### Context Provider

The `TeamProvider` wraps the app and provides:
- Current team selection
- User permissions for the current team
- Team switching functionality
- Permission checking utilities

## Usage Examples

### Backend - Route Protection

```typescript
// Protect campaign routes
app.post('/api/campaigns', 
  authenticate, 
  requirePermission('create_campaign'), 
  CampaignController.create
);

// Manual permission check
export const CampaignController = {
  async updateCampaign(req: AuthenticatedRequest, res: Response) {
    const { teamId, campaignId } = req.params;
    const userId = req.user!.id;
    
    const permissionCheck = await TeamService.checkUserPermission(
      teamId, 
      userId, 
      'edit_campaign'
    );
    
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Update campaign logic...
  }
};
```

### Frontend - Conditional Rendering

```tsx
import { PermissionGuard } from '@/components/common/PermissionGuard';

function CampaignCard({ campaign }) {
  return (
    <Card>
      <h3>{campaign.name}</h3>
      
      <PermissionGuard permission="edit_campaign">
        <Button onClick={() => editCampaign(campaign.id)}>
          Edit Campaign
        </Button>
      </PermissionGuard>
      
      <PermissionGuard permission="delete_campaign">
        <Button variant="destructive" onClick={() => deleteCampaign(campaign.id)}>
          Delete Campaign
        </Button>
      </PermissionGuard>
    </Card>
  );
}
```

### Frontend - Permission Hooks

```tsx
import { useTeam } from '@/contexts/TeamContext';

function CampaignManager() {
  const { hasPermission, currentTeam } = useTeam();
  
  const canCreateCampaign = hasPermission('create_campaign');
  const canManageTeam = hasPermission('manage_team');
  
  return (
    <div>
      {canCreateCampaign && (
        <Button onClick={createCampaign}>Create Campaign</Button>
      )}
      
      {canManageTeam && (
        <Button onClick={() => setShowMembersModal(true)}>
          Manage Team
        </Button>
      )}
    </div>
  );
}
```

## Security Considerations

1. **Backend Validation**: Always validate permissions on the backend, never trust frontend-only checks
2. **Role Immutability**: Team owners cannot be modified or removed
3. **Permission Inheritance**: Admins automatically get `manage_team` permission
4. **Team Isolation**: Users can only access data from teams they're members of

## Installation & Setup

1. **Database Migration**: Run `npm run db:push` to apply schema changes
2. **Environment**: Ensure DATABASE_URL is configured
3. **Dependencies**: All required packages are already installed

## File Structure

```
server/
├── db/
│   ├── schema/
│   │   ├── team.schema.ts      # Team database schema
│   │   └── relations.ts        # Database relations
│   └── services/
│       └── team.service.ts     # Team database operations
├── controllers/
│   └── team.controller.ts      # Team API controllers
├── routes/
│   └── team.routes.ts          # Team API routes
└── middleware/
    └── auth.middleware.ts      # Permission middleware

client/src/
├── store/
│   └── slices/
│       └── teamSlice.ts        # Redux team state
├── contexts/
│   └── TeamContext.tsx        # Team context provider
├── components/
│   ├── teams/
│   │   ├── TeamSelector.tsx
│   │   ├── CreateTeamModal.tsx
│   │   └── TeamMembersManager.tsx
│   └── common/
│       └── PermissionGuard.tsx
├── api/
│   └── teamApi.ts              # Team API calls
└── pages/
    └── Teams.tsx               # Teams management page

shared/
├── types/
│   └── team.types.ts           # Shared TypeScript types
└── constants/
    └── constants.ts            # Role and permission enums
```

This comprehensive teams feature provides a solid foundation for multi-user collaboration with fine-grained access control in the Chunumunu Ads Platform.
