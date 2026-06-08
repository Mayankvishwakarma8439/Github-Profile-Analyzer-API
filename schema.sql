CREATE DATABASE IF NOT EXISTS github_analyzer;
USE github_analyzer;

CREATE TABLE IF NOT EXISTS analyzed_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(100) UNIQUE NOT NULL,
  name            VARCHAR(200),
  bio             TEXT,
  avatar_url      VARCHAR(500),
  location        VARCHAR(200),
  company         VARCHAR(200),
  blog            VARCHAR(300),
  public_repos    INT DEFAULT 0,
  public_gists    INT DEFAULT 0,
  followers       INT DEFAULT 0,
  following       INT DEFAULT 0,
  total_stars     INT DEFAULT 0,
  top_languages   JSON,
  account_age_days INT,
  profile_url     VARCHAR(300),
  github_created_at DATETIME,
  analyzed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
