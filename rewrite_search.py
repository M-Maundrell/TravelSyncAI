import re

with open("index.html", "r") as f:
    content = f.read()

new_logic = """
      const patToken = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (patToken) {
        statusText.innerText = 'Sincronizando solicitud con GitHub Actions...';
        try {
          await commitSearchRequestToGitHub(patToken, searchRoutes);
          await triggerGitHubWorkflow(patToken);
          statusText.innerText = 'Ejecutando descubrimiento en vivo (Tomará ~60 segundos)...';
          
          // Animar barra de progreso durante 60 segundos
          for (let i = 0; i <= 60; i++) {
            await new Promise(r => setTimeout(r, 1000));
            progress = (i / 60) * 100;
            progressBar.style.width = `${progress}%`;
            percentageText.innerText = `${Math.round(progress)}%`;
            if (i % 10 === 0) {
               // Update icons randomly or progressively
               const r = searchRoutes[Math.min(searchRoutes.length - 1, Math.floor((i/60) * searchRoutes.length))];
               if (r) {
                 const icon = document.getElementById(`status-icon-${r.segment}`);
                 if (icon) icon.className = 'w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] border-2 border-white';
               }
            }
          }
        } catch(e) {
          console.error(e);
          statusText.innerText = 'Error contactando GitHub Actions. Usando motor de respaldo estático.';
          await new Promise(r => setTimeout(r, 2000));
        }
      } else {
        statusText.innerText = 'Modo Estático: Sin GitHub Token. Usando motor de vuelos de respaldo...';
        await new Promise(r => setTimeout(r, 2000));
      }

      statusText.innerText = 'Optimización completada. Generando menú...';
      setTimeout(async () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        await loadLiveFlightsData(true); // force reload flights.json to get new live data
        await loadDynamicCatalog();
        goToStep(3);
      }, 800);
    }
"""

# Find the end of startOptimizationAndSearch logic.
# The original code has a loop: `let progress = 0; for (const route of searchRoutes) { ... } setTimeout(...)`
pattern = re.compile(r'let progress = 0;\s*for \(const route of searchRoutes\) \{.*setTimeout\(async \(\) => \{.*\}, 800\);\s*\}', re.DOTALL)
content = pattern.sub(new_logic, content)

with open("index.html", "w") as f:
    f.write(content)
