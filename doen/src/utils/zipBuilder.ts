/**
 * Minimal ZIP file builder (STORE method, no compression).
 * Works in the browser without any external dependencies.
 */

interface ZipEntry {
  name: string
  data: Uint8Array
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

export function buildZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder()

  // Calculate sizes
  let localHeadersSize = 0
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    localHeadersSize += 30 + nameBytes.length + entry.data.length
  }

  let centralDirSize = 0
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    centralDirSize += 46 + nameBytes.length
  }

  const eocdSize = 22
  const totalSize = localHeadersSize + centralDirSize + eocdSize
  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  let localOffset = 0
  const centralEntries: { nameBytes: Uint8Array; crc: number; size: number; offset: number }[] = []

  // Write local file headers + data
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length
    const entryOffset = localOffset

    centralEntries.push({ nameBytes, crc, size, offset: entryOffset })

    // Local file header signature
    writeUint32(view, localOffset, 0x04034B50); localOffset += 4
    // Version needed
    writeUint16(view, localOffset, 20); localOffset += 2
    // General purpose bit flag
    writeUint16(view, localOffset, 0); localOffset += 2
    // Compression method (0 = STORE)
    writeUint16(view, localOffset, 0); localOffset += 2
    // Last mod file time
    writeUint16(view, localOffset, 0); localOffset += 2
    // Last mod file date
    writeUint16(view, localOffset, 0); localOffset += 2
    // CRC-32
    writeUint32(view, localOffset, crc); localOffset += 4
    // Compressed size
    writeUint32(view, localOffset, size); localOffset += 4
    // Uncompressed size
    writeUint32(view, localOffset, size); localOffset += 4
    // File name length
    writeUint16(view, localOffset, nameBytes.length); localOffset += 2
    // Extra field length
    writeUint16(view, localOffset, 0); localOffset += 2
    // File name
    bytes.set(nameBytes, localOffset); localOffset += nameBytes.length
    // File data
    bytes.set(entry.data, localOffset); localOffset += size
  }

  const centralDirOffset = localOffset

  // Write central directory
  for (const ce of centralEntries) {
    // Central directory file header signature
    writeUint32(view, localOffset, 0x02014B50); localOffset += 4
    // Version made by
    writeUint16(view, localOffset, 20); localOffset += 2
    // Version needed to extract
    writeUint16(view, localOffset, 20); localOffset += 2
    // General purpose bit flag
    writeUint16(view, localOffset, 0); localOffset += 2
    // Compression method
    writeUint16(view, localOffset, 0); localOffset += 2
    // Last mod file time
    writeUint16(view, localOffset, 0); localOffset += 2
    // Last mod file date
    writeUint16(view, localOffset, 0); localOffset += 2
    // CRC-32
    writeUint32(view, localOffset, ce.crc); localOffset += 4
    // Compressed size
    writeUint32(view, localOffset, ce.size); localOffset += 4
    // Uncompressed size
    writeUint32(view, localOffset, ce.size); localOffset += 4
    // File name length
    writeUint16(view, localOffset, ce.nameBytes.length); localOffset += 2
    // Extra field length
    writeUint16(view, localOffset, 0); localOffset += 2
    // File comment length
    writeUint16(view, localOffset, 0); localOffset += 2
    // Disk number start
    writeUint16(view, localOffset, 0); localOffset += 2
    // Internal file attributes
    writeUint16(view, localOffset, 0); localOffset += 2
    // External file attributes
    writeUint32(view, localOffset, 0); localOffset += 4
    // Relative offset of local header
    writeUint32(view, localOffset, ce.offset); localOffset += 4
    // File name
    bytes.set(ce.nameBytes, localOffset); localOffset += ce.nameBytes.length
  }

  // End of central directory record
  writeUint32(view, localOffset, 0x06054B50); localOffset += 4
  // Number of this disk
  writeUint16(view, localOffset, 0); localOffset += 2
  // Disk where central directory starts
  writeUint16(view, localOffset, 0); localOffset += 2
  // Number of central directory records on this disk
  writeUint16(view, localOffset, centralEntries.length); localOffset += 2
  // Total number of central directory records
  writeUint16(view, localOffset, centralEntries.length); localOffset += 2
  // Size of central directory
  writeUint32(view, localOffset, centralDirSize); localOffset += 4
  // Offset of start of central directory
  writeUint32(view, localOffset, centralDirOffset); localOffset += 4
  // Comment length
  writeUint16(view, localOffset, 0)

  return new Blob([buffer], { type: 'application/zip' })
}
