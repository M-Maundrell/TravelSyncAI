import re

with open("index.html", "r") as f:
    content = f.read()

pattern = re.compile(r'const patToken = localStorage\.getItem\(GITHUB_TOKEN_KEY\);.*?await new Promise\(r => setTimeout\(r, 400\)\);\s*\}\s*\}', re.DOTALL)

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
          flightsCatalog = { ...flightsCatalog, ...newFlights };
          if (statusText) statusText.innerText = 'Vuelos descargados exitosamente desde Azure.';
          
          for (let i = 0; i < searchRoutes.length; i++) {
              const legDot = document.getElementById(`disc-dot-${i}`);
              const legState = document.getElementById(`disc-state-${i}`);
              if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
              if (legState) {
                  legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
                  legState.innerText = `✓ Vuelos descargados`;
              }
          }
        } else {
          throw new Error("Backend error");
        }
      } catch(e) {
        console.error('API backend error', e);
        if (statusText) statusText.innerText = 'Backend no disponible. Generando vuelos estáticos locales...';
        for (let i = 0; i < searchRoutes.length; i++) {
            generateFallbackFlights(searchRoutes[i], searchRoutes[i].dep, searchRoutes[i].arr, searchRoutes[i].date);
            const legDot = document.getElementById(`disc-dot-${i}`);
            const legState = document.getElementById(`disc-state-${i}`);
            if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
            if (legState) {
                legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
                legState.innerText = `✓ Vuelos de respaldo`;
            }
        }
      }

      if (progressBar) progressBar.style.width = '100%';
      if (percentageText) percentageText.innerText = '100%';
      
      await new Promise(r => setTimeout(r, 800));
      statusText.innerText = 'Optimización completada. Generando menú...';
"""

content = pattern.sub(new_logic.strip(), content)

# Remove the two github api functions injected previously
content = re.sub(r'async function commitSearchRequestToGitHub.*?async function startOptimizationAndSearch', 'async function startOptimizationAndSearch', content, flags=re.DOTALL)

with open("index.html", "w") as f:
    f.write(content)
