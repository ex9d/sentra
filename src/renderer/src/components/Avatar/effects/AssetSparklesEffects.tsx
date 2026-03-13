import React from 'react'
import { RobloxSparkles } from './RobloxSparkles'
import { SparklesInstance } from './fireUtils'

interface AssetSparklesEffectsProps {
  sparkles: SparklesInstance[]
  /** Scale factor for the entire scene (to match 3D model scaling) */
  scale?: number
}

/**
 * Renders all sparkles effects extracted from an asset hierarchy
 * Should be used inside a R3F Canvas context
 */
export const AssetSparklesEffects: React.FC<AssetSparklesEffectsProps> = ({
  sparkles,
  scale = 1
}) => {
  if (!sparkles || sparkles.length === 0) return null

  return (
    <group scale={scale}>
      {sparkles.map((sparkle, index) => (
        <RobloxSparkles
          key={`sparkles-${index}`}
          enabled={sparkle.enabled}
          sparkleColor={sparkle.sparkleColor}
          timeScale={sparkle.timeScale}
          position={[
            sparkle.position.x * 0.1, // Scale down from Roblox studs
            sparkle.position.y * 0.1,
            sparkle.position.z * 0.1
          ]}
          parentSize={[
            sparkle.parentSize.x * 0.1,
            sparkle.parentSize.y * 0.1,
            sparkle.parentSize.z * 0.1
          ]}
        />
      ))}
    </group>
  )
}

export default AssetSparklesEffects
