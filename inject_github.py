with open("index.html", "r") as f:
    content = f.read()

with open("add_github_api.js", "r") as f:
    js = f.read()

content = content.replace("async function startOptimizationAndSearch() {", js + "\n    async function startOptimizationAndSearch() {")

with open("index.html", "w") as f:
    f.write(content)
