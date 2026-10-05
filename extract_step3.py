import re

with open('/Users/lusarmie/.gemini/antigravity/scratch/travel-planner/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'^(\s*function\s+renderStep3\s*\([^)]*\)\s*\{)', re.MULTILINE)
match = pattern.search(content)
start_idx = match.start()
brace_count = 0
in_func = False
for i in range(start_idx, len(content)):
    if content[i] == '{':
        brace_count += 1
        in_func = True
    elif content[i] == '}':
        brace_count -= 1
        if in_func and brace_count == 0:
            end_idx = i + 1
            with open('/Users/lusarmie/.gemini/antigravity/scratch/travel-planner/step3_orig.js', 'w', encoding='utf-8') as out:
                out.write(content[start_idx:end_idx])
            break
