# GitHub Profile Analyzer

A Node.js API that analyzes GitHub user profiles by fetching GitHub data and storing analyzed results in a MySQL database. The project is deployed on Railway and uses Railway's MySQL service for storage.

## Features

- Fetch GitHub user profile data and repositories
- Collect profile metadata:
  - username
  - full name
  - bio
  - avatar URL
  - location
  - public repositories
  - followers
  - following
  - GitHub profile URL
  - GitHub account creation date
- Calculate repository statistics:
  - total stars
  - total forks
  - repos analyzed
  - original vs forked repos
  - archived repo count
  - last pushed date
  - repos updated in the last 90 days
- Compute top repositories by stars
- Compute top programming languages across repositories
- Calculate GitHub account age in days
- Store analyzed profile results in MySQL
- Expose API endpoints for analyzing and retrieving profiles

## Tech Stack

- Node.js
- Express
- Axios
- MySQL (via `mysql2`)
- Railway deployment

## Project Structure

- `src/app.js` — Express server setup
- `src/routes/github.js` — API route definitions
- `src/controllers/githubController.js` — GitHub analysis logic and database storage
- `src/config/db.js` — MySQL connection pool configuration
- `schema.sql` — database and table schema for local setup

## Environment Variables

Create a `.env` file in the project root with the following values:

```env
PORT=3000
GITHUB_TOKEN=your_github_personal_access_token
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
```

### Railway Notes

When deployed on Railway, configure the same environment variables in Railway project settings.

- Use Railway's MySQL plugin for `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT`
- Add `GITHUB_TOKEN` as a Railway environment variable to avoid GitHub rate limits

## Local Setup

1. Clone the repository:

```bash
git clone https://github.com/Mayankvishwakarma8439/Github-Profile-Analyzer-API.git
cd github-profile-analyzer
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file and add your environment variables.

4. Initialize the database locally using `schema.sql` (if using a local MySQL instance):

```bash
mysql -u <user> -p < schema.sql
```

5. Start the server:

```bash
npm run dev
```

6. Open the API:

```bash
http://localhost:3000
```

## API Endpoints

Public base URL:

```text
https://github-profile-analyzer-api-production-3940.up.railway.app
```

Local base URL:

```text
http://localhost:3000
```

### Health Check

`GET /`

Returns a simple status message.

Public example:

```bash
curl https://github-profile-analyzer-api-production-3940.up.railway.app/
```

### Analyze GitHub Profile

`POST /api/analyze/:username`

- Fetches GitHub profile and repository data for `:username`
- Computes insights
- Stores the analyzed profile result in MySQL

Example:

```bash
curl -X POST http://localhost:3000/api/analyze/octocat
```

Public example:

```bash
curl -X POST https://github-profile-analyzer-api-production-3940.up.railway.app/api/analyze/octocat
```

### Get All Stored Profiles

`GET /api/profiles`

Returns all analyzed profiles from the database.

Public example:

```bash
curl https://github-profile-analyzer-api-production-3940.up.railway.app/api/profiles
```

### Get Profile by Username

`GET /api/profiles/:username`

Returns the stored analysis for a specific GitHub username.

Example:

```bash
curl http://localhost:3000/api/profiles/octocat
```

Public example:

```bash
curl https://github-profile-analyzer-api-production-3940.up.railway.app/api/profiles/octocat
```

## Deployment

This project is deployed on Railway with the following setup:

- Public API URL: `https://github-profile-analyzer-api-production-3940.up.railway.app`
- Railway Node.js deployment
- Railway MySQL plugin for database storage
- Environment variables configured in Railway

## Notes

- A GitHub personal access token is required for authenticated API requests and to avoid GitHub rate limiting.
- The app stores analyzed profile results in the `analyzed_profiles` table defined in `schema.sql`.
- If you use Railway MySQL, the schema can be created automatically or executed manually against the Railway database.

## Scripts

- `npm start` — Run the app in production mode
- `npm run dev` — Run the app with `nodemon` for local development
