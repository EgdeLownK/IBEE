import re

file1 = r'c:\Users\KillianLQ\IBEE\apps\platform\src\components\profile\product-create\steps\StepTypeSpecific.tsx'
file2 = r'c:\Users\KillianLQ\IBEE\apps\platform\src\components\profile\product-create\steps\StepEssentials.tsx'

with open(file1, 'r', encoding='utf-8') as f:
    c1 = f.read()

with open(file2, 'r', encoding='utf-8') as f:
    c2 = f.read()

# 1. Extract CONDITION_LABELS and OptionRow from file1
match_option_row = re.search(r'(const CONDITION_LABELS.*?)(export function StepTypeSpecific)', c1, re.DOTALL)
option_row_code = match_option_row.group(1)

# 2. Extract VariantCard from file1
match_variant_card = re.search(r'(export function VariantCard.*)', c1, re.DOTALL)
variant_card_code = match_variant_card.group(1)

# 3. Extract functions inside StepTypeSpecific from file1
match_funcs = re.search(r'(  function variantErr.*?)(  if \(form\.type === \'digital\'\))', c1, re.DOTALL)
funcs_code = match_funcs.group(1)

# 4. Extract UI block for unique and variants from file1
match_ui = re.search(r'(      {form\.variationMode === \'unique\' && \(.*?</section>)', c1, re.DOTALL)
ui_block = match_ui.group(1)
ui_block_content = ui_block.replace('</section>', '').strip()

# Now remove these from c1
c1 = c1.replace(option_row_code, '')
c1 = c1.replace(variant_card_code, '')
c1 = c1.replace(funcs_code, '')
c1 = c1.replace(ui_block, '</section>')
c1 = c1.replace("import { Plus, Trash2, X } from 'lucide-react'", "import { Trash2 } from 'lucide-react'")
c1 = c1.replace("import { PHYSICAL_CONDITIONS } from '@ibee/shared'\n", "")

# Now insert into c2
# A. Add imports
c2 = c2.replace("import { ChevronLeft, ChevronRight, Crop, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'", "import { ChevronLeft, ChevronRight, Crop, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'")
c2 = c2.replace("import { AddressAutocomplete } from '../AddressAutocomplete'", "import { AddressAutocomplete } from '../AddressAutocomplete'\nimport { PHYSICAL_CONDITIONS } from '@ibee/shared'")

# B. Insert OptionRow code
c2 = c2.replace("type Props = {", option_row_code + "\ntype Props = {")

# C. Insert funcs code
c2 = c2.replace("  function err(field: string) {\n    return form.fieldErrors[field]\n  }\n", "  function err(field: string) {\n    return form.fieldErrors[field]\n  }\n\n" + funcs_code)

# D. Insert VariantCard code at the end
c2 = c2 + "\n\n" + variant_card_code

# E. Insert UI block at the end of StepEssentials return
c2 = c2.replace("    </section>\n  )\n}", "\n" + ui_block_content + "\n    </section>\n  )\n}")

# F. Remove the variationMode selector from StepEssentials since it's part of ui_block?
# Actually the variationMode selector is ALREADY in StepEssentials. Let's not remove it but let's append ui_block_content below it!
# Wait, ui_block_content has orm.variationMode === 'unique' and orm.variationMode !== 'unique' which is what we want!

with open(file1, 'w', encoding='utf-8') as f:
    f.write(c1)

with open(file2, 'w', encoding='utf-8') as f:
    f.write(c2)

print('Refactor done.')
