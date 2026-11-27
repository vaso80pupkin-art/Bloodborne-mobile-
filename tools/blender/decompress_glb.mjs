import fs from 'fs'
import { MeshoptDecoder } from 'meshoptimizer/meshopt_decoder.mjs'

const [src, dst] = process.argv.slice(2)

await MeshoptDecoder.ready

const raw = fs.readFileSync(src)
const magic = raw.readUInt32LE(0)
const jsonLen = raw.readUInt32LE(12)
const json = JSON.parse(raw.slice(20, 20 + jsonLen).toString())
const binOffset = 20 + jsonLen
const binLen = raw.readUInt32LE(binOffset - 8)
const bin = raw.slice(binOffset, binOffset + binLen)

const ext = 'EXT_meshopt_compression'
if (!json.extensionsUsed || !json.extensionsUsed.includes(ext)) {
  console.log('no meshopt extension found; copying as-is')
  fs.copyFileSync(src, dst)
  process.exit(0)
}

const views = json.bufferViews
const outParts = []
let outOffset = 0

for (const view of views) {
  const comp = view.extensions?.[ext]
  let data
  if (comp) {
    const srcData = bin.subarray(comp.byteOffset || 0, (comp.byteOffset || 0) + comp.byteLength)
    const decoded = new Uint8Array(comp.count * comp.byteStride)
    MeshoptDecoder.decodeGltfBuffer(decoded, comp.count, comp.byteStride, srcData, comp.mode, comp.filter || 'NONE')
    data = Buffer.from(decoded.buffer, decoded.byteOffset, decoded.length)
    delete view.extensions
    if (Object.keys(view.extensions || {}).length === 0 && 'extensions' in view) delete view.extensions
    view.byteLength = decoded.length
  } else {
    data = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)
  }
  const pad = (4 - (outOffset % 4)) % 4
  if (pad) {
    outParts.push(Buffer.alloc(pad))
    outOffset += pad
  }
  view.byteOffset = outOffset
  outParts.push(data)
  outOffset += data.length
}

json.extensionsUsed = json.extensionsUsed.filter((e) => e !== ext)
if (json.extensionsUsed.length === 0) delete json.extensionsUsed
if (json.extensionsRequired) {
  json.extensionsRequired = json.extensionsRequired.filter((e) => e !== ext)
  if (json.extensionsRequired.length === 0) delete json.extensionsRequired
}

const buffers = json.buffers || [{ byteLength: 0 }]
buffers[0].byteLength = outOffset

const padJson = (4 - (jsonLen % 4)) % 4
const jsonBuf = Buffer.from(JSON.stringify(json))
const jsonPadded = Buffer.concat([jsonBuf, Buffer.alloc(padJson, 0x20)])
const padBin = (4 - (outOffset % 4)) % 4
const binPadded = Buffer.concat([Buffer.concat(outParts), Buffer.alloc(padBin)])

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0) // 'glTF'
header.writeUInt32LE(2, 4)
const total = 12 + 8 + jsonPadded.length + 8 + binPadded.length
header.writeUInt32LE(total, 8)

const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(jsonPadded.length, 0)
jsonHeader.writeUInt32LE(0x4e4f534a, 4) // 'JSON'
const binHeader = Buffer.alloc(8)
binHeader.writeUInt32LE(binPadded.length, 0)
binHeader.writeUInt32LE(0x004e4942, 4) // 'BIN\0'

fs.writeFileSync(dst, Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]))
console.log(`decompressed: ${views.length} bufferViews, bin ${binLen} -> ${outOffset} bytes, written to ${dst}`)
