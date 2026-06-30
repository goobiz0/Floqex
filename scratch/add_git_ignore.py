import re

with open('eslint.config.mjs', 'r') as f:
    content = f.read()

content = content.replace('"node_modules/**",', '"node_modules/**",\n    ".git/**",')

with open('eslint.config.mjs', 'w') as f:
    f.write(content)

