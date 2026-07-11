import QRCode from 'qrcode'
import os from 'os'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../../docs/qr-codes')
const PORT = 5174

// 3 个演示路灯
const LAMP_IDS = ['lamp_001', 'lamp_002', 'lamp_003']

/**
 * 获取本机局域网 IPv4 地址
 * 优先取 192.168.20.x 网段，否则取第一个非虚拟的 IPv4
 */
function getLanIP() {
  const interfaces = os.networkInterfaces()
  let fallback = null

  for (const [name, addrs] of Object.entries(interfaces)) {
    // 跳过虚拟适配器
    if (/virtual|vmware|vbox|hyper-v|loopback|docker|wsl/i.test(name)) continue

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue

      // 优先 192.168.20.x（本项目局域网段）
      if (addr.address.startsWith('192.168.20.')) {
        return addr.address
      }
      // 其次任意 192.168.x.x
      if (addr.address.startsWith('192.168.') && !fallback) {
        fallback = addr.address
      }
      // 最后任意非内部 IPv4
      if (!fallback) fallback = addr.address
    }
  }
  return fallback || 'localhost'
}

async function main() {
  const ip = getLanIP()
  const baseUrl = `http://${ip}:${PORT}`

  console.log(`\n🌐 当前 LAN IP: ${ip}`)
  console.log(`📱 游客端地址: ${baseUrl}`)
  console.log(`📂 输出目录:   ${OUT_DIR}\n`)

  for (const lampId of LAMP_IDS) {
    const url = `${baseUrl}/?lamp=${lampId}`
    const filePath = resolve(OUT_DIR, `${lampId}.png`)

    await QRCode.toFile(filePath, url, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#3d2e1c', light: '#ffffff' },
    })

    const label = lampId.replace('lamp_', '')
    console.log(`  ✅ ${lampId}.png — 路灯 #${label}`)
    console.log(`     ${url}\n`)
  }

  console.log('🎉 QR 码已全部更新，扫码即可访问对应路灯页面。\n')
}

main().catch(err => {
  console.error('❌ QR 码生成失败:', err)
  process.exit(1)
})
