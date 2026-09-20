const fetchGithubContributions = async (req, res) => {
    try {
        const username = process.env.GITHUB_USERNAME;
        const token = process.env.GITHUB_TOKEN;

        const headers = { Authorization: `bearer ${token}` };
        const body = {
            query: `query {
        user(login: "${username}") {
          contributionsCollection {
            contributionCalendar {
              colors
              totalContributions
              months { firstDay name totalWeeks }
              weeks {
                contributionDays { color contributionCount date }
                firstDay
              }
            }
          }
        }
      }`,
        };

        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            body: JSON.stringify(body),
            headers: headers,
        });

        if (!response.ok) throw new Error("Failed to fetch GitHub contributions");
        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0].message);
        
        return res.status(200).json(result.data);
    } catch (err) {
        console.error("Github Service Error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
};

module.exports = { fetchGithubContributions };