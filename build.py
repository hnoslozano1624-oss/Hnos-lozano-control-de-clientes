import base64, glob

# Une las partes del código fuente en orden
partes = sorted(glob.glob('src/partes/parte*.html'))
t = ''.join(open(p, encoding='utf8', newline='').read() for p in partes)


def b64(f, mime):
    return 'data:%s;base64,' % mime + base64.b64encode(open(f, 'rb').read()).decode()


t = (t.replace('__DYLIA__', b64('assets/dylia.jpg', 'image/jpeg'))
      .replace('__LOGO_H__', b64('assets/logo_h.png', 'image/png'))
      .replace('__SYM__', b64('assets/logo_sym.png', 'image/png')))
open('clientes-dl.html', 'w', encoding='utf8').write(t)
print('Generado clientes-dl.html', len(t), 'caracteres')
