import re

f1 = r'c:\Users\KillianLQ\IBEE\apps\platform\src\components\profile\product-create\steps\StepEssentials.tsx'
f2 = r'c:\Users\KillianLQ\IBEE\apps\platform\src\components\profile\product-create\steps\StepTypeSpecific.tsx'

with open(f1, 'r', encoding='utf-8') as f:
    c1 = f.read()

with open(f2, 'r', encoding='utf-8') as f:
    c2 = f.read()

# 1. Extract states and functions
match_state = re.search(r'(  const \[activeTab.*?)\n  function err', c1, re.DOTALL)
state_code = match_state.group(1).rstrip() + "\n"

match_funcs = re.search(r'(  function addBullet.*?)\n  return \(', c1, re.DOTALL)
funcs_code = match_funcs.group(1).rstrip() + "\n"

# 2. Extract UI block
# It starts around <div className="pco__field mt-6"> for activeTab
match_ui = re.search(r'(      <div className="pco__field mt-6">.*?)    </section>', c1, re.DOTALL)
ui_block = match_ui.group(1)

# Remove from c1
c1 = c1.replace(state_code, '')
c1 = c1.replace(funcs_code, '')
c1 = c1.replace(ui_block, '')

# Add to c2
# A. Add state
c2 = c2.replace("  function err(field: string) {", state_code + "\n  function err(field: string) {")
# B. Add funcs
c2 = c2.replace("  function handleOptionNameChange", funcs_code + "\n  function handleOptionNameChange")

# C. Add UI
c2 = c2.replace("    </section>", "\n" + ui_block + "    </section>")

with open(f1, 'w', encoding='utf-8') as f:
    f.write(c1)

with open(f2, 'w', encoding='utf-8') as f:
    f.write(c2)

print('Moved successfully.')
