# Coach Crew Manager - AI Coding Guidelines

## Architecture Overview
This is a full-stack sports team management application with React/TypeScript frontend and Node.js/Express backend.

- **Frontend** (`src/`): React app using Vite, shadcn/ui components, Tailwind CSS, React Query for API state, contexts for global state (SeasonContext, ThemeContext).
- **Backend** (`server/`): Express.js API with MongoDB/Mongoose, JWT authentication, role-based access (admin/coach/player).
- **Data Flow**: Frontend calls backend REST APIs via Axios; auth tokens stored in localStorage; season selection enforced via SeasonGuard.
- **Key Integration**: Email service for verification; file uploads via Multer.

## Developer Workflows
- **Frontend Dev**: `npm run dev` (Vite dev server on port 8080)
- **Backend Dev**: `cd server && npm run dev` (Nodemon on port 5000)
- **Build**: `npm run build` (Vite production build)
- **Lint**: `npm run lint` (ESLint)
- **API URL**: Configured via `VITE_API_URL` env var (defaults to http://localhost:5000)

## Code Conventions
- **Imports**: Use `@/` alias for `src/` directory (e.g., `@/components/ui/button`)
- **Components**: shadcn/ui pattern with `class-variance-authority` for variants, `clsx` for conditional classes
- **API Calls**: Use React Query hooks; include auth headers with `Authorization: Bearer ${token}`
- **Backend Auth**: Password validation uses `password === name` (demo mode); JWT tokens include role and IDs
- **Error Handling**: Backend uses `next(err)` for middleware; frontend uses try/catch with toast notifications
- **File Structure**: Pages in `src/pages/` by role (admin/, coach/, player/); backend MVC in `controllers/`, `models/`, `routes/`

## Key Files to Reference
- `src/App.tsx`: Main routing and providers setup
- `src/contexts/SeasonContext.tsx`: Season management and validation
- `server/controllers/authController.js`: Authentication logic (note demo password check)
- `server/models/season.js`: Mongoose schema examples
- `src/lib/api.ts`: Axios instance and base API utilities

## Patterns to Follow
- Wrap admin routes with `<SeasonGuard>` to enforce active season selection
- Use `useSeason()` hook for accessing current season state
- Store user data in localStorage as `auth_token` and `activeSeason`
- Backend controllers return `{ success: boolean, message: string, data? }` format
- Use `import.meta.env` for frontend env vars (Vite)