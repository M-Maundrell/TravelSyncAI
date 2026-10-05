import re

with open("index.html", "r") as f:
    content = f.read()

old_logic = """
      for (let i = 0; i < searchRoutes.length; i++) {
        const route = searchRoutes[i];
        const pct = Math.round(((i + 0.6) / searchRoutes.length) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (percentageText) percentageText.innerText = `${pct}%`;
        if (statusText) statusText.innerText = `Consultando ${route.dep} ➔ ${route.arr}...`;

        const legDot = document.getElementById(`disc-dot-${i}`);
        const legState = document.getElementById(`disc-state-${i}`);
        if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
        if (legState) legState.innerText = 'Consultando en vivo...';

        // Check if catalog lacks options
        generateFallbackFlights(route, route.dep, route.arr, route.date);
        
        if (legState) {
          legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
          legState.innerText = `✓ Vuelos generados`;
        }
        if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        await new Promise(r => setTimeout(r, 100));
      }
"""

new_logic = """
      const patToken = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (patToken) {
         try {
            if (statusText) statusText.innerText = 'Iniciando conexión con GitHub Actions...';
            await commitSearchRequestToGitHub(patToken, searchRoutes);
            await triggerGitHubWorkflow(patToken);
            
            if (statusText) statusText.innerText = 'Buscando en vivo con SerpAPI (~60 segundos)...';
            
            for (let i = 0; i < 60; i++) {
                if (progressBar) progressBar.style.width = `${Math.min(99, i * 1.66)}%`;
                if (percentageText) percentageText.innerText = `${Math.min(99, Math.round(i * 1.66))}%`;
                
                const currentLegIdx = Math.min(searchRoutes.length - 1, Math.floor((i / 60) * searchRoutes.length));
                const legDot = document.getElementById(`disc-dot-${currentLegIdx}`);
                const legState = document.getElementById(`disc-state-${currentLegIdx}`);
                
                if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
                if (legState) legState.innerText = 'Consultando SerpAPI...';
                
                // Set previous ones to complete
                for (let j = 0; j < currentLegIdx; j++) {
                    const prevDot = document.getElementById(`disc-dot-${j}`);
                    const prevState = document.getElementById(`disc-state-${j}`);
                    if (prevDot) prevDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
                    if (prevState) {
                        prevState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
                        prevState.innerText = `✓ Vuelos descargados`;
                    }
                }
                await new Promise(r => setTimeout(r, 1000));
            }
            
            // force fetch flights.json with cache bust
            const cacheBust = '?t=' + new Date().getTime();
            const res = await fetch('data/flights.json' + cacheBust);
            if (res.ok) {
                flightsCatalog = await res.json();
            }
         } catch(e) {
            console.error('GitHub Actions fallback error', e);
            // Fallback
            for (let i = 0; i < searchRoutes.length; i++) {
                const route = searchRoutes[i];
                generateFallbackFlights(route, route.dep, route.arr, route.date);
            }
         }
      } else {
          // No token -> Fast Fallback
          for (let i = 0; i < searchRoutes.length; i++) {
            const route = searchRoutes[i];
            const pct = Math.round(((i + 0.6) / searchRoutes.length) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (percentageText) percentageText.innerText = `${pct}%`;
            if (statusText) statusText.innerText = `Consultando ${route.dep} ➔ ${route.arr}...`;

            const legDot = document.getElementById(`disc-dot-${i}`);
            const legState = document.getElementById(`disc-state-${i}`);
            if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
            if (legState) legState.innerText = 'Generando vuelos estáticos...';

            generateFallbackFlights(route, route.dep, route.arr, route.date);
            
            if (legState) {
              legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
              legState.innerText = `✓ Vuelos de respaldo generados`;
            }
            if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
            await new Promise(r => setTimeout(r, 400));
          }
      }
"""

content = content.replace(old_logic.strip(), new_logic.strip())

with open("index.html", "w") as f:
    f.write(content)
