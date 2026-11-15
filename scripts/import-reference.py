"""One-time local import of Zin's authorized reference metadata and cat art."""
import json
from pathlib import Path
from PIL import Image

project = Path(__file__).resolve().parents[1]
root = project.parent
out = project / 'dist'
(out / 'assets').mkdir(exist_ok=True)
(out / 'data').mkdir(exist_ok=True)
images = {
    'hero': 'b8e81d725c16', 'library': '3827d2097518', 'avatar': 'Cat.png',
    'consumer-behaviour': '7d6b421db0d2', 'digital-marketing': '109b3244e14f',
    'e-commerce': '6b50a70e8e4e', 'management-information-system': 'b1d23366dcdb',
    'logistics-management': 'dbafa6d18d95', 'principle-of-marketing': '99f3ba88b5e7',
    'introduction-to-marketing-career': '33a257434c45', 'microeconomics': '9e791fd54db3',
    'macroeconomics': '204b276791dc', 'business-management': 'b3284e5234cf',
    'certificates': 'da0e89860677', 'ielts': 'b940450a05b3', 'hsk': 'ad767a6d78de'
}
asset_sources = []
for name, token in images.items():
    source = next(p for p in (root / 'Image').iterdir() if token in p.name)
    im = Image.open(source).convert('RGB')
    im.thumbnail((1400 if name == 'hero' else 800, 1000))
    im.save(out / 'assets' / (name + '.webp'), quality=84)
    asset_sources.append({'asset': name + '.webp', 'source': str(source.relative_to(root))})

def read(p):
    return json.loads((root / p).read_text(encoding='utf-8-sig'))

inventory = read('book-inventory.json')
gpa = read('Tham-khao-thiet-ke/Notion/gpa-theo-hoc-ky.json')
goals = read('Tham-khao-thiet-ke/Notion/muc-tieu-notion.json')
course_names = [
    'Consumer Behaviour','Digital Marketing','E-Commerce','Management Information System',
    'Logistics Management','Principle of Marketing','Introduction to Marketing Career',
    'Microeconomics','Macroeconomics','Business Management'
]
courses=[]
for name in course_names:
    key = name.lower().replace(' ', '-')
    books = [b for b in inventory['books'] if (b.get('course','').lower().replace('principles of marketing','principle of marketing') == name.lower())]
    courses.append({'id':key,'name':name,'current':name in course_names[:5],
                    'image':'assets/'+key+'.webp','books':[{
                        'id':b['sha256'][:16], 'title':b['title'], 'authors':b.get('authors',[]),
                        'pages':b.get('pages'), 'filename':Path(b['file']).name,
                        'sha256':b['sha256'], 'edition':b.get('edition')
                    } for b in books]})
for c in courses:
    if c['id']=='logistics-management':
        c['books']=[{'id':'logistics-slides','title':'Distribution & Logistics Management',
                     'authors':['Jacob Kulleh'], 'pages':None,'filename':'Supply Chain.ppt',
                     'edition':'MKT203 course slides','legacy':True}]
payload={'checked':'2026-11-16','courses':courses,'gpa':gpa,'goals':goals}
(out/'data'/'reference.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
(project/'ASSET-SOURCES.json').write_text(json.dumps(asset_sources,ensure_ascii=False,indent=2),encoding='utf-8')
print('Imported',len(courses),'courses and',len(asset_sources),'optimized cat images.')
