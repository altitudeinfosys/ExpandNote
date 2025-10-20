# Authentication System Documentation

## Overview

ExpandNote uses Supabase Auth for user authentication with email/password and email verification.

## Features Implemented

✓ **Email/Password Sign Up** with email verification
✓ **Email Verification** via callback handler
✓ **Login** with session management
✓ **Logout** functionality
✓ **Protected Routes** via middleware
✓ **Auth State Management** with React Context
✓ **Auto-redirect** for authenticated/unauthenticated users

## Architecture

### Authentication Flow

```
┌─────────────┐
│   Sign Up   │──────> Email Verification Required
└─────────────┘
       │
       ▼
┌─────────────┐
│ Verify Email│──────> Click link in email
└─────────────┘
       │
       ▼
┌─────────────┐
│    Login    │──────> Dashboard
└─────────────┘
```

### File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── lib/
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── server.ts            # Server Supabase client
│       └── middleware.ts        # Session refresh & route protection
├── app/
│   ├── signup/
│   │   └── page.tsx             # Sign up page
│   ├── login/
│   │   └── page.tsx             # Login page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # Email verification callback
│   └── dashboard/
│       └── page.tsx             # Protected dashboard
└── middleware.ts                # Next.js middleware entry
```

## Components

### 1. AuthContext (`src/contexts/AuthContext.tsx`)

Provides authentication state and methods to the entire app.

**Exports:**
- `AuthProvider` - Wrap your app with this
- `useAuth()` - Hook to access auth state

**State:**
- `user` - Current user object or null
- `session` - Current session or null
- `loading` - Boolean indicating if auth is initializing

**Methods:**
- `signUp(email, password)` - Register new user
- `signIn(email, password)` - Log in existing user
- `signOut()` - Log out current user

**Usage:**
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, signOut } = useAuth();

  if (user) {
    return <button onClick={signOut}>Sign Out</button>;
  }
  return <a href="/login">Log In</a>;
}
```

### 2. Supabase Clients

#### Browser Client (`src/lib/supabase/client.ts`)
- Used in client components
- Manages cookies automatically

#### Server Client (`src/lib/supabase/server.ts`)
- Used in server components and API routes
- Handles cookie management for SSR

### 3. Middleware (`src/lib/supabase/middleware.ts`)

Handles:
- Session refresh on every request
- Route protection (redirects unauthenticated users)
- Auto-redirect authenticated users away from auth pages

**Protected Routes:**
- `/dashboard`
- `/notes`
- `/settings`
- `/ai-profiles`

**Auth Routes** (redirect to dashboard if logged in):
- `/login`
- `/signup`

## Pages

### Sign Up Page (`/signup`)

**Features:**
- Email validation
- Password strength check (min 6 characters)
- Password confirmation
- Email verification notice after signup

**Validation:**
- All fields required
- Valid email format
- Password min 6 characters
- Passwords must match

### Login Page (`/login`)

**Features:**
- Email/password authentication
- Remember me checkbox (UI only for now)
- Forgot password link (to be implemented)
- Auto-redirect to intended page after login
- Error handling for unverified emails

**Redirect Handling:**
If user tries to access protected route, they're redirected to login with `?redirect=/intended-path` parameter. After successful login, they're sent to that intended page.

### Dashboard Page (`/dashboard`)

**Features:**
- Protected route (requires authentication)
- Displays user email
- Sign out button
- Placeholder cards for future features

### Auth Callback (`/auth/callback`)

**Purpose:**
Handles email verification links from Supabase.

**Flow:**
1. User clicks verification link in email
2. Callback exchanges code for session
3. Redirects to dashboard on success
4. Redirects to login with error on failure

## Configuration

### Environment Variables

Required in `.env.local` and Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dtgxsrpxxdhzjaxevhwp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Supabase Settings

#### Email Templates

Customize in: Supabase Dashboard → Authentication → Email Templates

**Confirm Signup Template:**
- Subject: Confirm Your Email
- Body: Contains `{{ .ConfirmationURL }}` link
- Redirect URL: `https://your-app.vercel.app/auth/callback`

#### URL Configuration

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://your-app.vercel.app
```

**Redirect URLs:**
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/*
http://localhost:3000/auth/callback    # For development
http://localhost:3000/*                # For development
```

## Testing Locally

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Sign Up Flow

1. Go to http://localhost:3000/signup
2. Enter email and password
3. Click "Sign Up"
4. Check email for verification link
5. Click verification link
6. Should redirect to dashboard

### 3. Test Login Flow

1. Go to http://localhost:3000/login
2. Enter verified email and password
3. Click "Log In"
4. Should redirect to dashboard

### 4. Test Protected Routes

1. Log out from dashboard
2. Try to access http://localhost:3000/dashboard
3. Should redirect to login
4. After login, should return to dashboard

### 5. Test Auth Redirects

1. While logged in, try to access http://localhost:3000/login
2. Should automatically redirect to dashboard

## Troubleshooting

### Email Verification Not Working

**Issue:** Verification link doesn't work
**Solution:**
1. Check Supabase redirect URLs include your domain
2. Verify callback route is at `/auth/callback`
3. Check email template has correct `{{ .ConfirmationURL }}`

### Cannot Log In After Verification

**Issue:** "Invalid login credentials" after verification
**Solution:**
1. Ensure email is actually verified (check Supabase → Auth → Users)
2. Try password reset if needed
3. Check for typos in email/password

### Infinite Redirect Loop

**Issue:** Page keeps redirecting
**Solution:**
1. Clear browser cookies
2. Check middleware logic for conflicts
3. Verify protected routes array doesn't include auth routes

### Session Not Persisting

**Issue:** User logged out on page refresh
**Solution:**
1. Check cookies are enabled in browser
2. Verify Supabase client is using cookie-based storage
3. Check middleware is refreshing session correctly

## Security Considerations

### Current Implementation

✓ Row Level Security (RLS) enabled on all database tables
✓ Users can only access their own data
✓ Session cookies are httpOnly and secure
✓ Passwords hashed by Supabase (bcrypt)
✓ Email verification required before login
✓ CSRF protection via Supabase

### TODO: Future Enhancements

- [ ] Rate limiting on auth endpoints
- [ ] Password reset functionality
- [ ] OAuth providers (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Account deletion
- [ ] Password strength meter
- [ ] Suspicious login detection

## API Reference

### AuthContext Methods

#### `signUp(email: string, password: string)`

Register a new user account.

**Parameters:**
- `email` - User's email address
- `password` - User's password (min 6 chars)

**Returns:**
```typescript
Promise<{ error: Error | null }>
```

**Example:**
```typescript
const { error } = await signUp('user@example.com', 'password123');
if (error) {
  console.error('Sign up failed:', error.message);
}
```

#### `signIn(email: string, password: string)`

Log in an existing user.

**Parameters:**
- `email` - User's email address
- `password` - User's password

**Returns:**
```typescript
Promise<{ error: Error | null }>
```

**Example:**
```typescript
const { error } = await signIn('user@example.com', 'password123');
if (error) {
  console.error('Login failed:', error.message);
}
```

#### `signOut()`

Log out the current user.

**Returns:**
```typescript
Promise<void>
```

**Example:**
```typescript
await signOut();
// User is now logged out
```

## Next Steps

### Immediate

- [ ] Implement password reset flow
- [ ] Add "Forgot Password" functionality
- [ ] Create user settings page
- [ ] Add profile editing

### Phase 2

- [ ] OAuth providers (Google, GitHub)
- [ ] Email templates customization
- [ ] Account deletion
- [ ] Session management (view/revoke sessions)

### Phase 3

- [ ] Two-factor authentication
- [ ] Security logs
- [ ] Login history
- [ ] Suspicious activity alerts

## Related Documentation

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [React Context](https://react.dev/reference/react/useContext)

---

**Authentication system is now fully functional and ready for development!**
