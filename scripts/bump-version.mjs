import fs from 'node:fs'

const v = process.argv[2]
if (!v) {
  console.error('Usage: node scripts/bump-version.mjs <version>')
  process.exit(1)
}

for (const f of ['package.json', 'src-tauri/tauri.conf.json']) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'))
  j.version = v
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n')
}

let cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8')
cargo = cargo.replace(/^version = ".*"$/m, `version = "${v}"`)
fs.writeFileSync('src-tauri/Cargo.toml', cargo)

let readme = fs.readFileSync('README.md', 'utf8')
readme = readme
  .replace(/hoy `0\.\d+\.\d+`/g, `hoy \`${v}\``)
  .replace(/ej\. `0\.\d+\.\d+`/g, `ej. \`${v}\``)
  .replace(/git tag v0\.\d+\.\d+/g, `git tag v${v}`)
  .replace(/git push origin v0\.\d+\.\d+/g, `git push origin v${v}`)
fs.writeFileSync('README.md', readme)

console.log('version ->', v)
