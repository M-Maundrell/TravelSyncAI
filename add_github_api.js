
    async function commitSearchRequestToGitHub(patToken, searchRoutes) {
      const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/search_request.json`;
      let sha = null;
      try {
        const getRes = await fetch(getUrl, {
          headers: {
            'Authorization': `Bearer ${patToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        }
      } catch (e) {
        console.log("No existing search_request.json found");
      }

      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(searchRoutes, null, 2))));
      const putBody = {
        message: 'chore: new search request from client',
        content: contentBase64,
        branch: 'main'
      };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(getUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${patToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });
      if (!putRes.ok) throw new Error('Failed to commit search request');
    }

    async function triggerGitHubWorkflow(patToken) {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update-flights.yml/dispatches`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${patToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main' })
      });
      if (!res.ok) throw new Error('Failed to trigger workflow');
    }
