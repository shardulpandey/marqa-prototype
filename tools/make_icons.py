"""Render the PWA icons (gold MARQA Q on ink) with an isolated headless Chrome.

  python tools/make_icons.py
"""
import io, os, re, shutil, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, '..', 'icons')
Q = os.path.join(HERE, '..', '..', 'business-case', 'q.svg')
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

q = io.open(Q, encoding='utf-8').read()
vb = re.search(r'viewBox="([^"]+)"', q).group(1).split()
W, H = float(vb[2]), float(vb[3])
BODY = re.sub(r'^<svg[^>]*>|</svg>$', '', q.strip())


def make(name, size, frac):
    gw = size * frac
    s = gw / W
    gh = H * s
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
           '<rect width="%d" height="%d" fill="#1A1A1A"/>'
           '<g transform="translate(%.2f %.2f) scale(%.5f)" fill="#B08D57">%s</g></svg>'
           % (size, size, size, size, size, size, (size - gw) / 2, (size - gh) / 2, s, BODY))
    tmp = tempfile.mkdtemp(prefix='mqicon-')
    try:
        page = os.path.join(tmp, 'i.html')
        io.open(page, 'w', encoding='utf-8').write('<html><body style="margin:0">%s</body></html>' % svg)
        out = os.path.abspath(os.path.join(ICONS, name))
        url = 'file:///' + page.replace(os.sep, '/')
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--user-data-dir=' + os.path.join(tmp, 'prof'), '--window-size=%d,%d' % (size, size),
                        '--screenshot=' + out, url], capture_output=True, timeout=90)
        print(name, os.path.getsize(out))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


make('icon-192.png', 192, 0.54)
make('icon-512.png', 512, 0.54)
make('maskable-512.png', 512, 0.40)
make('apple-touch-icon.png', 180, 0.54)
