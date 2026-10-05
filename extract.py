import re
import sys

with open('index.html', 'r') as f:
    content = f.read()

funcs = [
    'getBlankState',
    'startOptimizationAndSearch',
    'renderStep3',
    'selectStep3Flight',
    'getSegments',
    'renderTimeline',
    'calculateTravelerCost',
    'generatePDF',
    'generateFallbackFlights'
]

for func in funcs:
    pattern = r'function\s+' + func + r'\s*\([^\)]*\)\s*\{'
    match = re.search(pattern, content)
    if match:
        start_idx = match.start()
        # count braces to find end
        idx = content.find('{', start_idx)
        braces = 1
        idx += 1
        while braces > 0 and idx < len(content):
            if content[idx] == '{':
                braces += 1
            elif content[idx] == '}':
                braces -= 1
            idx += 1
        print(f"================== {func} ==================")
        print(content[start_idx:idx])
        print("\n\n")

