import re

with open("index.html", "r") as f:
    content = f.read()

# Remove the previously injected GitHub functions if they exist
content = re.sub(r'async function commitSearchRequestToGitHub.*?async function startOptimizationAndSearch\(\) \{', 'async function startOptimizationAndSearch() {', content, flags=re.DOTALL)

old_logic_pattern = re.compile(r'const patToken = localStorage\.getItem\(GITHUB_TOKEN_KEY\);.*?\}\s*\}\s*statusText\.innerText = \'Optimización completada\. Generando menú...\';', re.DOTALL)

new_logic = """
      if (statusText) statusText.innerText = 'Consultando Azure Serverless Backend...';
      try {
        const res = await fetch('/api/update-flights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchRoutes)
        });
        
        if (res.ok) {
          const newFlights = await res.json();
          // Merge new flights into catalog
          flightsCatalog = { ...flightsCatalog, ...newFlights };
          if (statusText) statusText.innerText = 'Vuelos descargados exitosamente desde SerpAPI.';
        } else {
          throw new Error("Backend error");
        }
      } catch(e) {
        console.error('API backend error', e);
        if (statusText) statusText.innerText = 'Backend no disponible. Generando vuelos estáticos locales...';
        // Fallback
        for (let i = 0; i < searchRoutes.length; i++) {
            generateFallbackFlights(searchRoutes[i], searchRoutes[i].dep, searchRoutes[i].arr, searchRoutes[i].date);
        }
      }

      if (progressBar) progressBar.style.width = '100%';
      if (percentageText) percentageText.innerText = '100%';
      
      await new Promise(r => setTimeout(r, 800));
      statusText.innerText = 'Optimización completada. Generando menú...';
"""

content = old_logic_pattern.sub(new_logic.strip(), content)

with open("index.html", "w") as f:
    f.write(content)
