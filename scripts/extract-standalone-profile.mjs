import fs from 'node:fs'
import zlib from 'node:zlib'

const html = fs.readFileSync('IBEE Profile (standalone).html', 'utf8')

const re = /"([0-9a-f-]{36})":\{"mime":"([^"]+)"(?:,"compressed":true)?(?:,"data":"([^"]+)")?/g
let m
while ((m = re.exec(html)) !== null) {
  const [, id, mime, data] = m
  let body = ''
  if (data) {
    try {
      body = zlib.gunzipSync(Buffer.from(data, 'base64')).toString('utf8')
    } catch {
      body = Buffer.from(data, 'base64').toString('utf8')
    }
  }
  console.log(id, mime, body.length)
  if (body.length > 5000) {
    const out = `.tmp-bundle-${id.slice(0, 8)}.jsx`
    fs.writeFileSync(out, body)
    const labels = ['Analyse', 'Visites', 'Abonnés', 'followers', 'Profil', 'Trafic', 'KPI', 'Performance', '30 jours', 'ChromeWindow', 'function App', 'Profile']
    for (const l of labels) {
      if (body.includes(l)) console.log('  ->', l)
    }
  }
}

// decode main html string (last big string in file)
const idx = html.lastIndexOf('"<!DOCTYPE html>')
if (idx >= 0) {
  let end = idx + 1
  let escaped = ''
  while (end < html.length) {
    const ch = html[end]
    if (ch === '"' && html[end - 1] !== '\\') break
    escaped += ch
    end++
  }
  try {
    const decoded = JSON.parse('"' + escaped + '"')
    fs.writeFileSync('.tmp-standalone-decoded.html', decoded)
    const texts = [...decoded.matchAll(/>([^<]{2,120})</g)]
      .map((x) => x[1].replace(/\s+/g, ' ').trim())
      .filter((t) => t && !/^[\d\s%€.,]+$/.test(t) && t.length > 2)
    console.log('\n--- visible texts ---')
    ;[...new Set(texts)].slice(0, 100).forEach((t) => console.log(t))
  } catch (e) {
    console.log('html decode err', e.message)
  }
}
