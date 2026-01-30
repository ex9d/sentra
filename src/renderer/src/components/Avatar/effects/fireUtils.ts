import * as THREE from 'three'

/**
 * Represents a Fire instance extracted from Roblox XML/RBXM
 */
export interface FireInstance {
  enabled: boolean
  color: THREE.Color
  secondaryColor: THREE.Color
  size: number
  heat: number
  /** Relative position of the fire (local to the accessory) */
  position: THREE.Vector3
  /** Size of the parent part for emitter bounds */
  parentSize: THREE.Vector3
}

/**
 * Represents a Sparkles instance extracted from Roblox XML/RBXM
 */
export interface SparklesInstance {
  enabled: boolean
  /** Sparkle color - default is Roblox purple (144, 25, 255)/255 */
  sparkleColor: THREE.Color
  /** Time scale for animation speed - default 1, 0 = frozen */
  timeScale: number
  /** Relative position of the sparkles (local to the accessory) */
  position: THREE.Vector3
  /** Size of the parent part for emitter bounds */
  parentSize: THREE.Vector3
}

/**
 * Property interface from XML parser
 */
interface Property {
  value: any
  type: string
}

/**
 * Instance interface from XML parser
 */
interface Instance {
  class: string
  referent: string
  properties: { [name: string]: Property }
  children: Instance[]
}

/**
 * Parses a Color3 property value from Roblox XML format
 * Handles multiple formats:
 * - Object format: { R: "0.5", G: "0.3", B: "0.1" }
 * - Packed integer (Roblox uses ARGB or packed RGB): 4281650924
 * - String number: "4281650924"
 * - Comma-separated string: "0.5, 0.3, 0.1" or "4.0767217860337887e+21, -219043090560, 0"
 */
const parseColor3 = (value: any): THREE.Color => {
  if (!value) return new THREE.Color(1, 1, 1)

  if (typeof value === 'object' && 'R' in value) {
    return new THREE.Color(
      parseFloat(value.R) || 0,
      parseFloat(value.G) || 0,
      parseFloat(value.B) || 0
    )
  }

  if (typeof value === 'string' && value.includes(',')) {
    const parts = value.split(',').map((s) => s.trim())
    if (parts.length >= 3) {
      let r = parseFloat(parts[0])
      let g = parseFloat(parts[1])
      let b = parseFloat(parts[2])

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn('[parseColor3] Invalid color values (NaN):', value)
        return new THREE.Color(144 / 255, 25 / 255, 255 / 255) // Default sparkle purple
      }

      if (r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255) {
        console.warn('[parseColor3] Invalid color values (out of range):', value)
        return new THREE.Color(144 / 255, 25 / 255, 255 / 255) // Default sparkle purple
      }

      if (r > 1 || g > 1 || b > 1) {
        r /= 255
        g /= 255
        b /= 255
      }

      r = Math.max(0, Math.min(1, r))
      g = Math.max(0, Math.min(1, g))
      b = Math.max(0, Math.min(1, b))

      return new THREE.Color(r, g, b)
    }
  }

  // Roblox stores Color3 as a packed 32-bit integer in format 0xFFRRGGBB (ARGB) or sometimes as 0xRRGGBB
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && /^-?\d+\.?\d*(?:e[+-]?\d+)?$/.test(value.trim()))
  ) {
    const numValue = typeof value === 'number' ? value : parseFloat(value)

    if (!isNaN(numValue) && Number.isInteger(numValue) && numValue >= 0 && numValue <= 0xffffffff) {
      const intValue = Math.floor(numValue)
      const r = ((intValue >> 16) & 0xff) / 255
      const g = ((intValue >> 8) & 0xff) / 255
      const b = (intValue & 0xff) / 255

      return new THREE.Color(r, g, b)
    }
  }

  if (typeof value === 'string' && value.startsWith('#')) {
    return new THREE.Color(value)
  }

  return new THREE.Color(1, 1, 1)
}

/**
 * Parses a Vector3 property value from Roblox XML format
 */
const parseVector3 = (value: any): THREE.Vector3 => {
  if (!value) return new THREE.Vector3(0, 0, 0)

  if (typeof value === 'object' && 'X' in value) {
    return new THREE.Vector3(
      parseFloat(value.X) || 0,
      parseFloat(value.Y) || 0,
      parseFloat(value.Z) || 0
    )
  }

  return new THREE.Vector3(0, 0, 0)
}

/**
 * Gets the size of a Part instance
 */
const getPartSize = (instance: Instance): THREE.Vector3 => {
  const sizeValue = instance.properties['size']?.value || instance.properties['Size']?.value
  if (sizeValue) {
    return parseVector3(sizeValue)
  }
  return new THREE.Vector3(2, 1, 4)
}

/**
 * Gets the position of an instance from its CFrame or Position
 */
const getInstancePosition = (instance: Instance): THREE.Vector3 => {
  const cframe = instance.properties['CFrame']?.value
  if (cframe && typeof cframe === 'object' && 'X' in cframe) {
    return new THREE.Vector3(
      parseFloat(cframe.X) || 0,
      parseFloat(cframe.Y) || 0,
      parseFloat(cframe.Z) || 0
    )
  }

  const position = instance.properties['Position']?.value
  if (position) {
    return parseVector3(position)
  }

  return new THREE.Vector3(0, 0, 0)
}

/**
 * Checks if an instance is a Part-like class that can have Fire
 */
const isPartLike = (className: string): boolean => {
  const partClasses = [
    'Part',
    'MeshPart',
    'WedgePart',
    'CornerWedgePart',
    'TrussPart',
    'SpawnLocation',
    'Seat',
    'VehicleSeat',
    'SkateboardPlatform',
    'UnionOperation',
    'NegateOperation'
  ]
  return partClasses.includes(className)
}

/**
 * Recursively extracts all Fire instances from a hierarchy
 * For accessories, positions are relative to the accessory's center since
 * the 3D model is centered at origin during loading.
 */
export const extractFireInstances = (
  root: Instance,
  parentPosition: THREE.Vector3 = new THREE.Vector3(),
  parentSize: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
): FireInstance[] => {
  const fires: FireInstance[] = []

  let currentPosition = parentPosition.clone()
  let currentSize = parentSize.clone()

  if (isPartLike(root.class)) {
    const partPosition = getInstancePosition(root)
    currentPosition = parentPosition.clone().add(partPosition)
    currentSize = getPartSize(root)
  }

  if (root.class === 'Fire') {
    const fire = parseFireInstance(root, currentPosition, currentSize)
    if (fire) {
      fires.push(fire)
    }
  }

  for (const child of root.children || []) {
    const childFires = extractFireInstances(child, currentPosition, currentSize)
    fires.push(...childFires)
  }

  return fires
}

/**
 * Parses a Fire instance from XML properties
 */
const parseFireInstance = (
  instance: Instance,
  position: THREE.Vector3,
  parentSize: THREE.Vector3
): FireInstance | null => {
  const props = instance.properties

  let enabled = true
  if (props['Enabled']) {
    const val = props['Enabled'].value
    enabled = val === 'true' || val === true || val === '1' || val === 1
  }

  // Default: color = #EC8B46 (236, 139, 70), secondaryColor = #8B5037 (139, 80, 55)
  let color = new THREE.Color(236 / 255, 139 / 255, 70 / 255)
  let secondaryColor = new THREE.Color(139 / 255, 80 / 255, 55 / 255)

  if (props['Color']?.value !== undefined) {
    const parsedColor = parseColor3(props['Color'].value)
    console.log('[Fire] Parsed Color:', props['Color'].value, '→', parsedColor)
    color = parsedColor
  }

  if (props['SecondaryColor']?.value !== undefined) {
    const parsedSecondary = parseColor3(props['SecondaryColor'].value)
    console.log(
      '[Fire] Parsed SecondaryColor:',
      props['SecondaryColor'].value,
      '→',
      parsedSecondary
    )
    secondaryColor = parsedSecondary
  }

  let size = 5
  const sizeVal = props['size_xml']?.value || props['Size']?.value || props['size']?.value
  if (sizeVal !== undefined) {
    size = Math.max(2, Math.min(30, parseFloat(sizeVal) || 5))
    console.log('[Fire] Size:', sizeVal, '→', size)
  }

  let heat = 9
  const heatVal = props['heat_xml']?.value || props['Heat']?.value || props['heat']?.value
  if (heatVal !== undefined) {
    heat = Math.max(-25, Math.min(25, parseFloat(heatVal) || 9))
    console.log('[Fire] Heat:', heatVal, '→', heat)
  }

  console.log('[Fire] Created fire instance:', { enabled, color, secondaryColor, size, heat })

  return {
    enabled,
    color,
    secondaryColor,
    size,
    heat,
    position: position.clone(),
    parentSize: parentSize.clone()
  }
}

/**
 * Finds all Fire instances in an asset hierarchy and returns render-ready data.
 * Positions are centered relative to the model since the 3D viewer centers
 * models at origin.
 */
export const findFiresInHierarchy = (hierarchy: Instance | null): FireInstance[] => {
  if (!hierarchy) return []

  const fires = extractFireInstances(hierarchy)

  if (fires.length > 0) {
    const center = new THREE.Vector3()
    fires.forEach((fire) => center.add(fire.position))
    center.divideScalar(fires.length)

    fires.forEach((fire) => {
      fire.position.sub(center)
    })
  }

  return fires
}

/**
 * Recursively extracts all Sparkles instances from a hierarchy
 * For accessories, positions are relative to the accessory's center since
 * the 3D model is centered at origin during loading.
 */
export const extractSparklesInstances = (
  root: Instance,
  parentPosition: THREE.Vector3 = new THREE.Vector3(),
  parentSize: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
): SparklesInstance[] => {
  const sparkles: SparklesInstance[] = []

  let currentPosition = parentPosition.clone()
  let currentSize = parentSize.clone()

  if (isPartLike(root.class)) {
    const partPosition = getInstancePosition(root)
    currentPosition = parentPosition.clone().add(partPosition)
    currentSize = getPartSize(root)
  }

  if (root.class === 'Sparkles') {
    const sparkle = parseSparklesInstance(root, currentPosition, currentSize)
    if (sparkle) {
      sparkles.push(sparkle)
    }
  }

  for (const child of root.children || []) {
    const childSparkles = extractSparklesInstances(child, currentPosition, currentSize)
    sparkles.push(...childSparkles)
  }

  return sparkles
}

/**
 * Parses a Sparkles instance from XML properties
 */
const parseSparklesInstance = (
  instance: Instance,
  position: THREE.Vector3,
  parentSize: THREE.Vector3
): SparklesInstance | null => {
  const props = instance.properties

  let enabled = true
  if (props['Enabled']) {
    const val = props['Enabled'].value
    enabled = val === 'true' || val === true || val === '1' || val === 1
  }

  // Default: Color3(144, 25, 255)/255.0f (purple)
  let sparkleColor = new THREE.Color(144 / 255, 25 / 255, 255 / 255)

  const colorProp = props['SparkleColor']?.value ?? props['Color']?.value
  if (colorProp !== undefined) {
    const parsedColor = parseColor3(colorProp)
    console.log('[Sparkles] Parsed SparkleColor:', colorProp, '→', parsedColor)
    sparkleColor = parsedColor
  }

  // Very small values like 1e-44 mean essentially frozen/paused
  let timeScale = 1
  const timeScaleVal = props['TimeScale']?.value
  if (timeScaleVal !== undefined) {
    timeScale = parseFloat(timeScaleVal) || 1
    console.log('[Sparkles] TimeScale:', timeScaleVal, '→', timeScale)
  }

  console.log('[Sparkles] Created sparkles instance:', { enabled, sparkleColor, timeScale })

  return {
    enabled,
    sparkleColor,
    timeScale,
    position: position.clone(),
    parentSize: parentSize.clone()
  }
}

/**
 * Finds all Sparkles instances in an asset hierarchy and returns render-ready data.
 * Positions are centered relative to the model since the 3D viewer centers
 * models at origin.
 */
export const findSparklesInHierarchy = (hierarchy: Instance | null): SparklesInstance[] => {
  if (!hierarchy) return []

  const sparkles = extractSparklesInstances(hierarchy)

  if (sparkles.length > 0) {
    const center = new THREE.Vector3()
    sparkles.forEach((s) => center.add(s.position))
    center.divideScalar(sparkles.length)

    sparkles.forEach((s) => {
      s.position.sub(center)
    })
  }

  return sparkles
}

export default findFiresInHierarchy
