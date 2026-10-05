import re

def get_function_body(content, func_name):
    # finds function definition and returns the full function text
    pattern = r'(?:async\s+)?function\s+' + func_name + r'\s*\([^)]*\)\s*\{'
    match = re.search(pattern, content)
    if not match:
        return None, -1, -1
    
    start_idx = match.start()
    brace_idx = match.end() - 1
    
    # count braces
    open_braces = 1
    i = brace_idx + 1
    while i < len(content) and open_braces > 0:
        if content[i] == '{':
            open_braces += 1
        elif content[i] == '}':
            open_braces -= 1
        i += 1
        
    return content[start_idx:i], start_idx, i

with open('/Users/lusarmie/.gemini/antigravity/scratch/travel-planner/index.html', 'r') as f:
    content = f.read()

funcs = [
    "getBlankState",
    "startOptimizationAndSearch",
    "renderStep3",
    "selectStep3Flight",
    "getSegments",
    "renderTimeline",
    "calculateTravelerCost",
    "generatePDF",
    "generateFallbackFlights"
]

for func in funcs:
    body, start, end = get_function_body(content, func)
    if body:
        print(f"Found {func} from {start} to {end}")
    else:
        print(f"NOT FOUND: {func}")
