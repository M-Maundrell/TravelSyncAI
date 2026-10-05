import re

def get_function_body(content, func_name):
    pattern = r'(?:async\s+)?function\s+' + func_name + r'\s*\([^)]*\)\s*\{'
    match = re.search(pattern, content)
    if not match:
        return None
    start_idx = match.start()
    brace_idx = match.end() - 1
    open_braces = 1
    i = brace_idx + 1
    while i < len(content) and open_braces > 0:
        if content[i] == '{':
            open_braces += 1
        elif content[i] == '}':
            open_braces -= 1
        i += 1
    return content[start_idx:i]

with open('/Users/lusarmie/.gemini/antigravity/scratch/travel-planner/index.html', 'r') as f:
    content = f.read()

funcs = [
    "getBlankState",
    "startOptimizationAndSearch",
    "renderStep3",
    "selectStep3Flight",
    "getSegments",
    "calculateTravelerCost",
    "generateFallbackFlights"
]

for func in funcs:
    with open(f"{func}.js", "w") as f:
        f.write(get_function_body(content, func))

