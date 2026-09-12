# NutriTrack AI

NutriTrack AI is a personal nutrition and calorie tracking application built for recording food intake, managing daily nutrition goals, and understanding progress over time. It combines conventional food logging and reporting with Gemini-powered nutrition extraction, a focused conversational assistant, and text-based PDF diary import.

## Features

### Core Features

- **Authentication:** Register, log in, retrieve the current user, and protect user-owned data with JWT bearer tokens.
- **Goal management:** Create an active daily goal, update it, view the current goal, and review goal history.
- **Food entry management:** Create, list, inspect, update, and delete entries containing meal type, quantity, calories, protein, carbohydrates, fat, and optional fiber.
- **Filtering and pagination:** Filter food entries by date range and meal type, with page and limit controls.
- **Dashboard:** View today’s consumed totals, goal targets, percentage progress, meal breakdown, and recent meals.
- **Reports:** View daily calorie trends over a range, macro totals, and actual-versus-goal comparisons for a date.
- **AI nutrition extraction:** Upload a food or nutrition-label image, extract estimated nutrition values with Gemini Vision, review the result, and save it as a food entry.

### Bonus Features

- **Conversational chat assistant:** A Gemini-backed assistant that classifies supported nutrition and app requests, logs meals, reports progress, retrieves goals, and answers nutrition questions.
- **Bulk import via PDF:** Upload a text-based food diary, preview parsed rows, and confirm up to 200 entries at once.
- **Multi-user support:** Users, goals, food entries, and AI extraction records are isolated by authenticated user ID.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- shadcn/ui-style components built on Radix UI primitives

### Backend

- Node.js
- Express.js 5
- TypeScript
- Multer for image and PDF uploads
- Helmet, CORS, and Morgan middleware

### Database

- PostgreSQL 16
- Prisma ORM 6

### Authentication and Validation

- JWT for access tokens
- bcrypt for password hashing
- Joi for backend request validation
- Zod and React Hook Form for frontend form handling

### AI and Operations

- Google Gemini through `@google/generative-ai`
- `pdf-parse` for text extraction from PDFs
- Docker and Docker Compose

## Architecture

NutriTrack AI uses a **modular monolith**. The backend is deployed as one application, but each business capability is organized into an independent module with its own routes, controller, service, repository, and validation code.

```text
HTTP request
	 |
	 v
Route -> Validation/Auth middleware -> Controller -> Service -> Repository -> Prisma -> PostgreSQL
```

Controllers translate HTTP requests into application calls and standardize responses. Services contain business rules and orchestration. Repositories own database queries, while Prisma provides the database client and type-safe persistence layer. This structure keeps the MVP straightforward to deploy while preserving clear boundaries for future extraction into separate services if the product grows.

## Project Structure

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/                 # Environment and Prisma client setup
│   │   ├── middlewares/            # Auth, validation, uploads, errors
│   │   ├── modules/
│   │   │   ├── ai/                 # Image nutrition extraction and save flow
│   │   │   ├── auth/               # Registration, login, current user
│   │   │   ├── chat/               # Intent classification and assistant actions
│   │   │   ├── dashboard/          # Daily summary and progress data
│   │   │   ├── foodEntries/        # Food entry CRUD and listing
│   │   │   ├── goals/              # Active and historical nutrition goals
│   │   │   ├── pdfImport/          # PDF preview, parsing, and confirmation
│   │   │   └── reports/            # Calories, macros, and goal comparisons
│   │   ├── routes/
│   │   ├── types/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                   # Shared authenticated API client
│   │   ├── components/ui/         # Reusable UI primitives
│   │   ├── features/
│   │   │   ├── aiUpload/          # AI analysis page and API calls
│   │   │   ├── auth/              # Login, registration, route guards
│   │   │   ├── chat/              # Assistant page
│   │   │   ├── dashboard/         # Dashboard page and types
│   │   │   ├── goals/             # Goal management page
│   │   │   ├── meals/             # Food entry management page
│   │   │   ├── pdfImport/         # PDF upload and review page
│   │   │   └── reports/           # Charts and report page
│   │   └── layouts/
│   └── package.json
├── docker-compose.yml
├── .env.example
└── package.json
```

The frontend routes are `/login`, `/register`, `/`, `/goals`, `/meals`, `/reports`, `/ai-upload`, `/assistant`, and `/pdf-import`. Protected application pages are rendered inside `AppLayout` after authentication.

## Database Design

The Prisma schema contains four application models:

- **User:** Stores the account name, unique email, bcrypt password hash, and timestamps.
- **NutritionGoal:** Stores daily calorie, protein, carbohydrate, fat, and optional weight targets. A user can have many historical goals, with active goals identified by `isActive`.
- **FoodEntry:** Stores a user’s meal type, food name, quantity, unit, entry date, calorie and macro values, optional fiber, and source (`MANUAL` or `AI_IMAGE`).
- **AiExtraction:** Stores the uploaded image path, raw Gemini response, normalized nutrition JSON, processing status, and any error message.

Relationships are user-owned and cascade on user deletion: one `User` has many `NutritionGoal`, `FoodEntry`, and `AiExtraction` records. Food entries and goals are indexed for user/date and user/active-state queries; AI extractions are indexed by user and creation time.

## API Overview

The API is served under `http://localhost:5000/api`. Authenticated endpoints expect `Authorization: Bearer <jwt>`.

### Health and Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/auth/register` | Create an account and return a token |
| POST | `/auth/login` | Authenticate and return a token |
| GET | `/auth/me` | Return the authenticated user |

### Goals, Food Entries, and Dashboard

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/dashboard/summary` | Today’s totals, targets, progress, meal breakdown, and recent meals |
| GET | `/goals/current` | Get the active goal |
| GET | `/goals/history` | List a user’s goals |
| POST | `/goals` | Create a new active goal |
| PUT | `/goals/current` | Update the active goal |
| POST | `/food-entries` | Create a food entry |
| GET | `/food-entries` | List entries with date, meal, page, and limit filters |
| GET | `/food-entries/:id` | Get one food entry |
| PUT | `/food-entries/:id` | Update a food entry |
| DELETE | `/food-entries/:id` | Delete a food entry |

### Reports

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/reports/weekly-calories?startDate=...&endDate=...` | Return a daily calorie trend for the requested range |
| GET | `/reports/macro-breakdown?startDate=...&endDate=...` | Return protein, carbohydrate, and fat totals |
| GET | `/reports/goal-comparison?date=...` | Compare consumed nutrition with the active goal |

### AI, Chat, and PDF Import

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/ai/extract-nutrition` | Upload an image in the `image` field and extract nutrition values |
| POST | `/ai/save-entry` | Save reviewed AI nutrition values as a food entry |
| POST | `/chat/message` | Classify and handle a supported assistant message |
| POST | `/pdf-import/preview` | Upload a PDF in the `pdf` field and preview parsed entries |
| POST | `/pdf-import/confirm` | Validate and create reviewed PDF rows, up to 200 entries |

Responses use the application’s `{ success, data, message }` response shape. Request validation is performed with Joi, and protected routes use the JWT authentication middleware.

## Swagger Documentation

Interactive OpenAPI documentation is available while the backend is running:

```text
http://localhost:5000/api/docs
```

The documentation covers all authentication, goal, food-entry, dashboard, report, AI, chat, and PDF-import endpoints. To call protected endpoints from Swagger UI:

1. Register or log in through the documented auth endpoint and copy the returned `data.token` value.
2. Select **Authorize** in the Swagger UI.
3. Paste the JWT into the bearer authentication field and select **Authorize**.
4. Execute protected requests; Swagger sends the token as `Authorization: Bearer <token>`.

The OpenAPI document is generated with `swagger-jsdoc` and served through `swagger-ui-express`. Swagger configuration is kept in `backend/src/config/swagger.ts`.

## AI Features

### Gemini Vision Nutrition Extraction

`POST /api/ai/extract-nutrition` accepts an image upload up to 5 MB. The backend sends the image and a strict JSON nutrition prompt to the configured Gemini model. The response is parsed and normalized into food name, quantity, unit, calories, protein, carbs, fat, and fiber. The raw response and normalized result are recorded in `AiExtraction`.

The user can review the extraction in the frontend before calling `/api/ai/save-entry`. Saved entries use `source = AI_IMAGE`; failed extractions are recorded with `FAILED` status and an error message.

### Conversational Nutrition Assistant

`POST /api/chat/message` sends the user message to Gemini for intent classification. Supported intents are:

- `CREATE_FOOD_ENTRY`: estimate nutrition and create a meal entry for today.
- `GET_CURRENT_GOAL`: return the active nutrition goal.
- `GET_TODAY_PROGRESS`: return consumed values and targets for today.
- `GET_WEEKLY_REPORT`: return weekly calorie trend, total, and average.
- `NUTRITION_QUESTION`: answer a concise nutrition question through Gemini.
- `UNKNOWN`: return a bounded explanation of supported assistant capabilities.

This is an application assistant with explicitly supported intents, not a general-purpose chat history system.

## PDF Import

The PDF workflow is upload, preview, user review, and confirmation. `POST /api/pdf-import/preview` accepts PDFs up to 10 MB and extracts text in memory. The parser recognizes tabular rows with these required columns:

- Date
- Food Name
- Meal Type
- Calories
- Protein
- Carbs
- Fat

Common header variants such as `Food`, `Item`, `Meal`, `Kcal`, `Energy`, and `Carbohydrates` are supported. Rows may use comma, tab, pipe, or clearly spaced column separation. Confirmed rows are validated before being written as `FoodEntry` records with `source = MANUAL`.

**Supported:** text-based PDFs containing extractable food diary text.

**Not supported:** OCR, scanned/image-only PDFs, and complex multi-line table rows. PDF import does not send documents to Gemini.

## Setup

### Local Development

Prerequisites:

- Node.js compatible with the repository dependencies
- npm
- Docker Desktop or a local PostgreSQL 16 instance
- A Gemini API key for AI features

1. Install workspace dependencies from the repository root:

	```bash
	npm install
	```

2. Create the environment file from the supplied template:

	```bash
	copy .env.example .env
	```

	On macOS/Linux, use `cp .env.example .env` instead. Set a real `JWT_SECRET` and `GEMINI_API_KEY` before using authentication or AI features.

3. Start PostgreSQL:

	```bash
	docker compose up postgres
	```

4. Generate the Prisma client and apply the development migration:

	```bash
	npm run prisma:generate
	npm run prisma:migrate
	```

5. Optionally load the demo account and sample goal/meal data:

	```bash
	npm run prisma:seed --workspace backend
	```

	The seed creates `demo@nutritrack.ai` with password `Password@123`.

6. Start the frontend and backend development servers:

	```bash
	npm run dev
	```

	The frontend is available at `http://localhost:5173`, and the API is available at `http://localhost:5000`.

Useful workspace commands:

```bash
npm run build
npm run lint
npm run prisma:studio
```

## Docker

Run the containerized database and backend with:

```bash
docker compose up --build
```

This starts:

- `postgres`: PostgreSQL 16 on port `5432`, with a health check and persistent `postgres_data` volume.
- `backend`: the production Node.js API on port `5000`, waiting for PostgreSQL health before starting.

The backend image runs Prisma client generation during its build and serves compiled code from `dist`. Uploaded files are persisted through `./backend/uploads:/app/uploads`. The current Compose file does not build the frontend; run the Vite frontend locally with `npm run dev` or deploy it separately.

## Environment Variables

The repository includes `.env.example` with the local-development defaults below:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | Yes | Secret used to sign JWT access tokens |
| `JWT_EXPIRES_IN` | No | JWT lifetime; defaults to `7d` |
| `GEMINI_API_KEY` | For AI | Gemini API key; AI routes return an error when it is absent |
| `CLIENT_ORIGIN` | No | Allowed frontend origin; defaults to `http://localhost:5173` |
| `GEMINI_MODEL` | No | Gemini model name; defaults to `gemini-3.6-flash` |
| `PORT` | No | Backend port; defaults to `5000` |
| `VITE_API_BASE_URL` | Frontend | Frontend API base URL; defaults to `http://localhost:5000/api` |

Do not commit real secrets or production database credentials.

## Demo Video

A complete walkthrough of NutriTrack AI is available here:

[Insert YouTube / Google Drive / Loom Video Link]

The demo should showcase:

- User registration
- Login
- Goal creation
- Food entry CRUD
- Dashboard
- Reports and charts
- AI nutrition extraction
- Conversational assistant
- PDF import
- Docker setup

## Screenshots

Add screenshots of the following application views after capturing the final UI:

### Login Page

_[Screenshot placeholder]_ 

### Register Page

_[Screenshot placeholder]_

### Dashboard

_[Screenshot placeholder]_

### Goals

_[Screenshot placeholder]_

### Meals

_[Screenshot placeholder]_

### Reports

_[Screenshot placeholder]_

### AI Analysis

_[Screenshot placeholder]_

### Chat Assistant

_[Screenshot placeholder]_

### PDF Import

_[Screenshot placeholder]_

## Assumptions

- This is an MVP for personal nutrition tracking; it is not a medical diagnosis or treatment product.
- Nutrition values entered manually or estimated by Gemini are user-reviewable estimates, not laboratory measurements.
- One active nutrition goal is used for dashboard and report comparisons; older goals remain available as history.
- Food entries are timestamped using the server’s date handling and grouped into the requested calendar-day ranges.
- The assistant intentionally supports a small set of product intents instead of maintaining a general conversation history.
- PDF imports require extractable text and create manual food entries after user confirmation.
- Uploaded images and PDF files are stored in the backend uploads area; production deployments should add retention, access-control, and object-storage policies.

## Future Improvements

- OCR support for scanned PDFs and image-only documents.
- Barcode scanning and packaged-food lookup.
- Advanced analytics, trends, and personalized insights.
- Export functionality for food logs and reports.
- Stronger production file lifecycle management and cloud object storage.
