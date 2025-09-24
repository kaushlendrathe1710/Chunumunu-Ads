# VideoStreamPro SSO Integration

## Overview
This document describes the Single Sign-On (SSO) integration with VideoStreamPro platform. The integration follows a client-server architecture where:

1. **Client** communicates directly with VideoStreamPro at `localhost:5000` for OTP flow
2. **Client** receives a short-lived verification token from VideoStreamPro 
3. **Client** sends the verification token to our ads platform backend for final authentication
4. **Backend** verifies the token with VideoStreamPro and creates/updates local user account

## Architecture Flow

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Client    │───▶│ VideoStreamPro  │───▶│ Ads Platform │
│  (React)    │    │  (localhost:5000)│    │   Backend    │
└─────────────┘    └─────────────────┘    └──────────────┘
      │                      │                      │
      │ 1. Send OTP         │                      │
      │ 2. Verify OTP       │                      │
      │ 3. Get Token        │                      │
      │                      │                      │
      │ 4. Verify Token ────────────────────────────│
      │ 5. Get User Data    │                      │
      │ 6. Create Local JWT │                      │
```

## Environment Configuration

### Server (.env)
```env
# VideoStreamPro SSO Configuration
VIDEOSTREAMPRO_AUTH_URL=https://videostreampro-domain.com/api/auth
VIDEOSTREAMPRO_API_KEY=your-secure-api-key

# JWT Configuration  
JWT_SECRET=your-ads-platform-jwt-secret
JWT_EXPIRY=7d
```

### Client (.env)
```env
# Client-side VideoStreamPro Configuration
VITE_VIDEOSTREAMPRO_API_KEY=your-secure-api-key
```

## API Endpoints

### VideoStreamPro APIs (Client calls directly)

#### 1. Send OTP
```http
POST http://localhost:5000/api/auth/send-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "apiKey": "your-api-key"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "email": "user@example.com"
}
```

#### 2. Verify OTP
```http
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com", 
  "code": "123456",
  "apiKey": "your-api-key"
}
```

Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "5m",
  "tokenType": "verification"
}
```

### Ads Platform Backend APIs

#### Verify Token
```http
POST /api/auth/sso/verify-token
Content-Type: application/json

{
  "token": "verification-token-from-videostreampro"
}
```

Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "username": "user123",
    "avatar": "https://avatar-url.com",
    "role": "user",
    "isVerified": true
  },
  "token": "ads-platform-jwt-token"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  role user_role DEFAULT 'user' NOT NULL,
  videostreampro_id INTEGER UNIQUE NOT NULL,
  auth_provider TEXT DEFAULT 'videostreampro' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Details

### Client Component (React)

The `SSOLogin` component handles the complete authentication flow:

```tsx
import { SSOLogin } from '@/components/auth/SSOLogin';

function AuthPage() {
  return <SSOLogin />;
}
```

Key features:
- Direct communication with VideoStreamPro at `localhost:5000`
- Two-step process: email → OTP verification
- Error handling for network issues and validation errors
- Automatic redirect after successful authentication

### Backend Service

The `VideoStreamProService` handles token verification:

```typescript
import { VideoStreamProService } from '../services/videostreampro.service';

// Verify token with VideoStreamPro
const user = await VideoStreamProService.verifyUserToken(verificationToken);
```

### User Management

The system supports:
- **New users**: Automatically created with VideoStreamPro data
- **Existing users**: Updated/linked with VideoStreamPro account
- **Default teams**: Auto-created for new users

## Security Considerations

1. **API Key Security**: 
   - Server API key stays on backend only
   - Client API key is environment-specific

2. **Token Lifecycle**:
   - VideoStreamPro verification tokens expire in 5 minutes
   - Ads platform JWT tokens have configurable expiry (default: 7 days)

3. **HTTPS**: Use HTTPS in production for all API calls

4. **Validation**: All inputs are validated using Zod schemas

## Error Handling

Common error scenarios:
- Invalid email format
- OTP send failures
- Invalid/expired OTP
- Network connectivity issues
- Token verification failures

Each error provides user-friendly messages and proper HTTP status codes.

## Development Setup

1. **Start VideoStreamPro**: Ensure it's running on `localhost:5000`
2. **Configure environment**: Set up `.env` files with API keys
3. **Database migration**: Run migration to add SSO fields
4. **Test flow**: Test complete authentication flow

## Testing

### Manual Testing
1. Enter email → should receive OTP
2. Enter OTP → should get verification token
3. Token verification → should create/update user and return JWT
4. Subsequent requests → should work with JWT authentication

### Integration Testing
Test the complete flow from client to VideoStreamPro to backend verification.

## Migration from Email OTP

For existing users with email authentication:
1. Users are automatically linked by email address
2. `videostreampro_id` is added when first authenticated via SSO
3. `auth_provider` is updated to 'videostreampro'
4. No data loss occurs during migration