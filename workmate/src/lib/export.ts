/**
 * Export helpers voor CSV en Excel downloads
 */

type ExportRow = Record<string, string | number>

/** Voorkom CSV formula injection (=CMD(), +cmd, -cmd, @SUM) */
function sanitizeCsvValue(val: string): string {
  if (val.length > 0 && '=+-@\t\r'.includes(val[0])) {
    return "'" + val
  }
  return val
}

/**
 * Genereer en download een CSV bestand (Excel-compatible met BOM)
 */
export function exportCSV(filename: string, headers: string[], rows: ExportRow[]) {
  const BOM = '\uFEFF' // UTF-8 BOM zodat Excel het correct opent
  const sep = ';'

  const csvRows = [
    headers.join(sep),
    ...rows.map((row) =>
      headers.map((h) => {
        const raw = String(row[h] ?? '')
        const val = sanitizeCsvValue(raw)
        // Escape values die het scheidingsteken of aanhalingstekens bevatten
        if (val.includes(sep) || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(sep)
    ),
  ].join('\r\n')

  const blob = new Blob([BOM + csvRows], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Genereer en download een Excel-compatibel XML bestand (.xlsx-achtig .xls)
 */
export function exportExcel(filename: string, headers: string[], rows: ExportRow[], sheetName = 'Data') {
  const escXml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${escXml(h)}</Data></Cell>`)
    .join('')

  const dataRows = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const val = row[h]
          const isNum = typeof val === 'number' || (typeof val === 'string' && /^-?\d+([.,]\d+)?$/.test(val) && val !== '')
          if (isNum) {
            const numStr = String(val).replace(/,/g, '.')
            return `<Cell><Data ss:Type="Number">${numStr}</Data></Cell>`
          }
          return `<Cell><Data ss:Type="String">${escXml(String(val ?? ''))}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Size="11"/>
      <Interior ss:Color="#E2EFDA" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escXml(sheetName)}">
    <Table>
      <Row ss:StyleID="header">${headerCells}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  downloadBlob(blob, `${filename}.xls`)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
