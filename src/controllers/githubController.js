import db from "../config/db.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GITHUB_HEADERS = {
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getAccountAgeDays(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt)) / MS_PER_DAY);
}

function countReposUpdatedRecently(repos, days = 90) {
  const cutoff = Date.now() - days * MS_PER_DAY;
  return repos.filter((repo) => new Date(repo.pushed_at) >= cutoff).length;
}

function getLatestPushDate(repos) {
  if (repos.length === 0) return null;

  const latest = repos.reduce((newest, repo) => {
    const pushedAt = new Date(repo.pushed_at);
    return pushedAt > newest ? pushedAt : newest;
  }, new Date(repos[0].pushed_at));

  return latest;
}

function getTopRepos(repos, limit = 5) {
  return [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit)
    .map((repo) => ({
      name: repo.name,
      stars: repo.stargazers_count,
      language: repo.language,
      url: repo.html_url,
      pushed_at: repo.pushed_at,
    }));
}

function formatCodeSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getTopLanguages(username, repos, limit = 10) {
  const langBytes = {};
  const sampleRepos = repos.filter((repo) => !repo.fork).slice(0, limit);

  for (const repo of sampleRepos) {
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${username}/${repo.name}/languages`,
        { headers: GITHUB_HEADERS },
      );

      for (const [lang, bytes] of Object.entries(data)) {
        langBytes[lang] = (langBytes[lang] || 0) + bytes;
      }
    } catch {
      // Skip repos where language data is unavailable.
    }
  }

  return Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language, bytes]) => ({
      language,
      size: formatCodeSize(bytes),
    }));
}

function buildProfileResponse(user, insights) {
  return {
    username: user.login,
    name: user.name,
    bio: user.bio,
    avatar_url: user.avatar_url,
    location: user.location,
    public_repos: user.public_repos,
    followers: user.followers,
    following: user.following,
    total_stars: insights.totalStars,
    total_forks: insights.totalForks,
    repos_analyzed: insights.reposAnalyzed,
    original_repos: insights.originalRepos,
    archived_repos: insights.archivedRepos,
    top_languages: insights.topLanguages,
    last_pushed_at: insights.lastPushedAt,
    repos_updated_90d: insights.reposUpdated90d,
    top_repos: insights.topRepos,
    account_age_days: getAccountAgeDays(user.created_at),
    profile_url: user.html_url,
    github_created_at: user.created_at,
  };
}

export const analyzeProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const { data: user } = await axios.get(
      `https://api.github.com/users/${username}`,
      { headers: GITHUB_HEADERS },
    );
    const { data: repos } = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers: GITHUB_HEADERS },
    );

    const totalStars = repos.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0,
    );
    const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
    const reposAnalyzed = repos.length;
    const originalRepos = repos.filter((repo) => !repo.fork).length;
    const archivedRepos = repos.filter((repo) => repo.archived).length;
    const lastPushedAt = getLatestPushDate(repos);
    const reposUpdated90d = countReposUpdatedRecently(repos);
    const topRepos = getTopRepos(repos);
    const topLanguages = await getTopLanguages(username, repos);

    const sql = `
      INSERT INTO analyzed_profiles
        (username, name, bio, avatar_url, location,
         public_repos, followers, following,
         total_stars, total_forks, repos_analyzed, original_repos, archived_repos,
         top_languages, last_pushed_at, repos_updated_90d, top_repos,
         profile_url, github_created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name                = VALUES(name),
        bio                 = VALUES(bio),
        avatar_url          = VALUES(avatar_url),
        location            = VALUES(location),
        public_repos        = VALUES(public_repos),
        followers           = VALUES(followers),
        following           = VALUES(following),
        total_stars         = VALUES(total_stars),
        total_forks         = VALUES(total_forks),
        repos_analyzed      = VALUES(repos_analyzed),
        original_repos      = VALUES(original_repos),
        archived_repos      = VALUES(archived_repos),
        top_languages       = VALUES(top_languages),
        last_pushed_at      = VALUES(last_pushed_at),
        repos_updated_90d   = VALUES(repos_updated_90d),
        top_repos           = VALUES(top_repos),
        profile_url         = VALUES(profile_url),
        github_created_at   = VALUES(github_created_at),
        updated_at          = CURRENT_TIMESTAMP
    `;

    const values = [
      user.login,
      user.name || null,
      user.bio || null,
      user.avatar_url || null,
      user.location || null,
      user.public_repos,
      user.followers,
      user.following,
      totalStars,
      totalForks,
      reposAnalyzed,
      originalRepos,
      archivedRepos,
      JSON.stringify(topLanguages),
      lastPushedAt,
      reposUpdated90d,
      JSON.stringify(topRepos),
      user.html_url,
      new Date(user.created_at),
    ];

    await db.execute(sql, values);

    return res.status(200).json({
      success: true,
      message: `Insights of "${user.login}" profile stored successfully.`,
      data: buildProfileResponse(user, {
        totalStars,
        totalForks,
        reposAnalyzed,
        originalRepos,
        archivedRepos,
        topLanguages,
        lastPushedAt,
        reposUpdated90d,
        topRepos,
      }),
    });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({
        success: false,
        message: `GitHub user "${username}" not found.`,
      });
    }
    if (err.response && err.response.status === 403) {
      return res.status(429).json({
        success: false,
        message: "GitHub API rate limit exceeded. Add a token to your .env",
      });
    }
    console.error(err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

function enrichStoredProfile(row) {
  const profile = { ...row };

  if (profile.github_created_at) {
    profile.account_age_days = getAccountAgeDays(profile.github_created_at);
  }

  return profile;
}

export const getAllProfiles = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM analyzed_profiles ORDER BY analyzed_at DESC",
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map(enrichStoredProfile),
    });
  } catch (err) {
    console.error(err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

export const getProfileByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM analyzed_profiles WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No analyzed profile found for "${username}". Call POST /api/analyze/${username} first.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: enrichStoredProfile(rows[0]),
    });
  } catch (err) {
    console.error(err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};
