import db from "../config/db.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const GITHUB_HEADERS = {
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
};

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
    const langMap = {};
    repos.forEach((repo) => {
      if (repo.language) {
        langMap[repo.language] = (langMap[repo.language] || 0) + 1;
      }
    });
    const topLanguages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count]) => ({ lang, count }));
    const createdAt = new Date(user.created_at);
    const accountAgeDays = Math.floor(
      (Date.now() - createdAt) / (1000 * 60 * 60 * 24),
    );
    const sql = `
      INSERT INTO analyzed_profiles
        (username, name, bio, avatar_url, location, company, blog,
         public_repos, public_gists, followers, following,
         total_stars, top_languages, account_age_days,
         profile_url, github_created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name              = VALUES(name),
        bio               = VALUES(bio),
        avatar_url        = VALUES(avatar_url),
        location          = VALUES(location),
        company           = VALUES(company),
        blog              = VALUES(blog),
        public_repos      = VALUES(public_repos),
        public_gists      = VALUES(public_gists),
        followers         = VALUES(followers),
        following         = VALUES(following),
        total_stars       = VALUES(total_stars),
        top_languages     = VALUES(top_languages),
        account_age_days  = VALUES(account_age_days),
        profile_url       = VALUES(profile_url),
        github_created_at = VALUES(github_created_at),
        updated_at        = CURRENT_TIMESTAMP
    `;
    const values = [
      user.login,
      user.name || null,
      user.bio || null,
      user.avatar_url || null,
      user.location || null,
      user.company || null,
      user.blog || null,
      user.public_repos,
      user.public_gists,
      user.followers,
      user.following,
      totalStars,
      JSON.stringify(topLanguages),
      accountAgeDays,
      user.html_url,
      new Date(user.created_at),
    ];
    await db.execute(sql, values);

    return res.status(200).json({
      success: true,
      message: `Insights of "${user.login}" profile stored successfully.`,
      data: {
        username: user.login,
        name: user.name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        location: user.location,
        company: user.company,
        blog: user.blog,
        public_repos: user.public_repos,
        public_gists: user.public_gists,
        followers: user.followers,
        following: user.following,
        total_stars: totalStars,
        top_languages: topLanguages,
        account_age_days: accountAgeDays,
        profile_url: user.html_url,
        github_created_at: user.created_at,
      },
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
export const getAllProfiles = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM analyzed_profiles ORDER BY analyzed_at DESC",
    );
    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
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
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};
