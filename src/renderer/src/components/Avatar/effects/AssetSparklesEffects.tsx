import React from 'react'
import { RobloxSparkles } from './RobloxSparkles'
import { SparklesInstance } from './fireUtils'

interface AssetSparklesEffectsProps {
  sparkles: SparklesInstance[]

  scale?: number
}





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
            sparkle.position.x * 0.1,
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