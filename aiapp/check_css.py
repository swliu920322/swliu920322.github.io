import re

html = open('index.html').read()
src = open('../../packages/interpreter/src/render.tsx').read() + open('src/demo.tsx').read()
classes = set()
for m in re.finditer(r'className="([^"]*)"|className=\{`([^`]*)`\}', src):
    c = m.group(1) or m.group(2)
    c = re.sub(r'\$\{[^}]*\}', '', c)
    classes.update(c.split())
missing = []
for c in sorted(classes):
    if not c or '{' in c:
        continue
    css_form = c.replace('/', r'\/').replace(':', r'\:').replace('[', r'\[').replace(']', r'\]').replace('.', r'\.')
    if '.' + css_form not in html:
        missing.append(c)
print('源码中所有静态 class:', len(classes))
print('CSS 缺失:', len(missing))
for m in missing:
    print('  MISS:', m)
