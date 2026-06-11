const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'dist')
const dest = path.join(__dirname, '..', 'pb', 'pb_public')

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name)
    const destPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

rimraf(dest)
copyRecursive(src, dest)
console.log('dist/ -> pb/pb_public/ synced')
