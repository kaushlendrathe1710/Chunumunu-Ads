# VideoStreamPro SSO Integration Guide

## Overview

This document describes the integration of VideoStreamPro Single Sign-On (SSO) authentication into the ChunuMunu Ads platform. The integration replaces the previous email OTP system and provides a secure, streamlined authentication experience.

## Architecture

### Authentication Flow
1. **User enters email** → VideoStreamPro sends OTP
2. **User enters OTP** → VideoStreamPro returns 5-minute verification token
3. **Ads platform verifies token** → Gets user data and creates/updates local account
4. **Ads platform generates JWT** → User is authenticated locally

### Database Changes

The user table has been updated to support VideoStreamPro authentication:

```sql
-- New fields added to users table
ALTER TABLE users ADD COLUMN videostreampro_id INTEGER UNIQUE NOT NULL;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'videostreampro' NOT NULL;

-- OTP tables removed (no longer needed)
DROP TABLE otp_codes;
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# VideoStreamPro SSO Configuration
VIDEOSTREAMPRO_AUTH_URL=https://videostreampro-domain.com/api/auth
VIDEOSTREAMPRO_API_KEY=your-secure-api-key
JWT_SECRET=your-ads-platform-jwt-secret
JWT_EXPIRY=7d
```

### VideoStreamPro API Endpoints

All endpoints require the `apiKey` parameter:

#### 1. Send OTP
```http
POST /send-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "apiKey": "your-api-key"
}
```

#### 2. Verify OTP
```http
POST /verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "apiKey": "your-api-key"
}
```

#### 3. Verify Token
```http
POST /verify-token
Content-Type: application/json

{
  "token": "verification-token-here",
  "apiKey": "your-api-key"
}
```

## Implementation Details

### Backend Services

#### VideoStreamPro Service (`server/services/videostreampro.service.ts`)
- Handles all communication with VideoStreamPro API
- Provides methods for OTP sending, verification, and user data retrieval
- Includes error handling and logging

#### User Service Updates (`server/db/services/user.service.ts`)
- Added VideoStreamPro-specific user operations
- `getUserByVideostreamproId()` - Find user by VideoStreamPro ID
- `upsertVideostreamproUser()` - Create or update user from VideoStreamPro data
- `createVideostreamproUser()` - Create new user with VideoStreamPro authentication

#### Auth Controller (`server/controllers/auth.controller.ts`)
- Completely rewritten to use VideoStreamPro SSO
- Removed old OTP and Google OAuth logic
- Simplified authentication flow

### Frontend Components

#### SSO Login Component (`client/src/components/auth/SSOLogin.tsx`)
- Two-step authentication UI (email → OTP)
- Input validation and error handling
- Loading states and user feedback
- Responsive design with proper styling

#### Updated Auth Page (`client/src/pages/Auth.tsx`)
- Simplified to use only SSO authentication
- Removed Google OAuth and email auth options
- Integrated with auth state management

### API Routes

#### New SSO Routes
- `POST /api/auth/sso/send-otp` - Send OTP via VideoStreamPro
- `POST /api/auth/sso/verify` - Verify OTP and authenticate user

#### Legacy Routes (for backwards compatibility)
- `POST /api/auth/send-otp` - Redirects to SSO
- `POST /api/auth/verify-otp` - Redirects to SSO

#### Removed Routes
- `POST /api/auth/google` - Google OAuth (removed)
- `GET /api/auth/google/test` - Google OAuth test (removed)

## Security Features

### API Security
- API key stays server-side only
- Verification tokens expire in 5 minutes
- HTTPS required in production
- Input validation on all endpoints

### Error Handling
- Network timeout handling
- Expired token handling
- User-friendly error messages
- Comprehensive logging

### User Experience
- Loading states during authentication
- Clear error messages
- Auto-focus on OTP input
- Resend OTP functionality

## Migration Guide

### Database Migration
1. Run `npm run db:generate` to create migration files
2. Run `npm run db:migrate` to apply schema changes
3. Existing users will be migrated when they first log in

### Configuration Updates
1. Add VideoStreamPro environment variables
2. Remove old OTP-related configuration
3. Update any hardcoded authentication URLs

### Frontend Updates
- Old authentication components removed
- New SSO component integrated
- Auth state management updated

## Testing

### Backend Testing
```bash
# Test SSO endpoints
curl -X POST http://localhost:3000/api/auth/sso/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

curl -X POST http://localhost:3000/api/auth/sso/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

### Frontend Testing
1. Navigate to `/auth`
2. Enter email address
3. Check email for OTP
4. Enter OTP code
5. Verify successful authentication

## Troubleshooting

### Common Issues

#### "Failed to send OTP"
- Check VideoStreamPro API URL and key
- Verify network connectivity
- Check VideoStreamPro service logs

#### "Authentication failed"
- Verify OTP code is correct and not expired
- Check token verification endpoint
- Review server logs for detailed errors

#### "User not found"
- Check database connection
- Verify user creation logic
- Review VideoStreamPro user data format

### Debugging
- Enable detailed logging in VideoStreamPro service
- Check network requests in browser dev tools
- Review database queries and user creation

## Future Enhancements

### Planned Features
- Remember device option
- Social login integration
- Multi-factor authentication
- Session management improvements

### Scalability Considerations
- User cache optimization
- Database indexing on VideoStreamPro ID
- Rate limiting on authentication endpoints
- Monitoring and analytics

## Support

For issues related to:
- **VideoStreamPro API**: Contact VideoStreamPro support
- **Integration issues**: Check this documentation and server logs
- **Database issues**: Review migration logs and schema

## Changelog

### v1.0.0 (Current)
- Initial VideoStreamPro SSO integration
- Removed email OTP system
- Updated user schema with SSO fields
- New SSO frontend components
- Comprehensive error handling