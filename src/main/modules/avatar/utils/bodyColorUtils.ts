const BODY_COLOR_BASE_KEYS = [
  'headColor',
  'torsoColor',
  'rightArmColor',
  'leftArmColor',
  'rightLegColor',
  'leftLegColor'
] as const



const BRICK_COLOR_TO_HEX: Record<number, string> = {
  1: 'F2F3F3',
  5: 'D7C59A',
  9: 'E8BAC8',
  18: 'CC8E69',
  21: 'C4281C',
  23: '0D69AC',
  24: 'F5CD30',
  26: '1B2A35',
  28: '287F47',
  29: 'A1C48C',
  37: '4B974B',
  38: 'AA5500',
  45: 'B4D2E4',
  101: 'DA867A',
  102: '6E99CA',
  104: '6B327C',
  105: 'E29B40',
  106: 'DA8541',
  107: '008F9C',
  119: 'A4BD47',
  125: 'EAB892',
  135: '74869D',
  141: '27462D',
  151: '789082',
  153: '957977',
  192: '694028',
  194: 'A3A2A5',
  199: '635F62',
  208: 'E5E4DF',
  217: '7C5C46',
  226: 'FDEA8D',
  1001: 'F8F8F8',
  1002: 'CDCDCD',
  1003: '111111',
  1004: 'FF0000',
  1005: 'FFB000',
  1006: 'B480FF',
  1007: '9F8660',
  1008: 'C1BE42',
  1009: 'FFFF00',
  1010: '0000FF',
  1011: '002060',
  1012: '2154B9',
  1013: 'A86F99',
  1014: 'AA5599',
  1015: 'AA00AA',
  1016: '993399',
  1017: 'FFCC00',
  1018: '006400',
  1019: '00FFFF',
  1020: '00FF00',
  1021: '3A7D15',
  1022: '7F8E64',
  1023: 'E8E8E8',
  1024: 'AFDDFF',
  1025: 'FFC9C9',
  1026: 'B1A7FF',
  1027: '9FF3E9',
  1028: 'CCFFCC',
  1029: 'FFFFCC',
  1030: 'FFCC99',
  1031: '6C584C',
  1032: 'FF9494'
}





export function brickColorToHex(brickColorId: number): string | undefined {
  return BRICK_COLOR_TO_HEX[brickColorId]
}




export function normalizeColor3(color: string): string {
  const trimmed = color.trim()
  if (trimmed.startsWith('#')) {
    return trimmed.slice(1).toUpperCase()
  }
  return trimmed.toUpperCase()
}




export function resolveBodyColorId(
  bodyColors: any,
  baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
): number | undefined {
  const directKey = `${baseKey}Id`
  if (typeof bodyColors[directKey] === 'number') {
    return bodyColors[directKey]
  }

  const altKey = `${baseKey}ID`
  if (typeof bodyColors[altKey] === 'number') {
    return bodyColors[altKey]
  }

  const nested = bodyColors[baseKey]
  if (nested && typeof nested === 'object') {
    const idCandidates = [
      nested.id,
      nested.Id,
      nested.brickColorId,
      nested.BrickColorId,
      nested.value,
      nested.Value
    ]

    const match = idCandidates.find((val) => typeof val === 'number')
    if (typeof match === 'number') {
      return match
    }
  }

  return undefined
}




export function resolveBodyColor3(
  bodyColors: any,
  baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
): string | undefined {
  const directKey = `${baseKey}3`
  if (typeof bodyColors[directKey] === 'string') {
    return normalizeColor3(bodyColors[directKey])
  }

  const nested = bodyColors[baseKey]
  if (nested && typeof nested === 'object') {
    const colorCandidates = [
      nested.color3,
      nested.Color3,
      nested.hexColor,
      nested.HexColor,
      nested.hex,
      nested.Hex,
      nested.color,
      nested.Color
    ]

    const match = colorCandidates.find((val) => typeof val === 'string')
    if (typeof match === 'string') {
      return normalizeColor3(match)
    }
  }

  return undefined
}




export function extractBodyColorIds(bodyColors: any): Record<string, number> | undefined {
  if (!bodyColors || typeof bodyColors !== 'object') {
    return undefined
  }

  const payload: Record<string, number> = {}

  BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
    const normalizedKey = `${baseKey}Id`
    const value = resolveBodyColorId(bodyColors, baseKey)
    if (typeof value === 'number') {
      payload[normalizedKey] = value
    }
  })

  return Object.keys(payload).length > 0 ? payload : undefined
}




export function extractBodyColor3s(bodyColors: any): Record<string, string> | undefined {
  if (!bodyColors || typeof bodyColors !== 'object') {
    return undefined
  }

  const payload: Record<string, string> = {}

  BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
    const normalizedKey = `${baseKey}3`
    const value = resolveBodyColor3(bodyColors, baseKey)
    if (typeof value === 'string') {
      payload[normalizedKey] = value
    }
  })

  const nestedBodyColor3s = bodyColors.bodyColor3s
  if (nestedBodyColor3s && typeof nestedBodyColor3s === 'object') {
    BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
      const normalizedKey = `${baseKey}3`
      const value = nestedBodyColor3s[normalizedKey]
      if (typeof value === 'string') {
        payload[normalizedKey] = normalizeColor3(value)
      }
    })
  }

  return Object.keys(payload).length > 0 ? payload : undefined
}




export function buildBodyColorsPayload(
  bodyColors: any
): Record<string, number | string> | undefined {
  const ids = extractBodyColorIds(bodyColors)
  const color3s = extractBodyColor3s(bodyColors)

  if (!ids && !color3s) {
    return undefined
  }

  return {
    ...(ids || {}),
    ...(color3s || {})
  }
}

export { BODY_COLOR_BASE_KEYS }