import React from 'react'
import { RobloxFire } from './RobloxFire'
import { FireInstance } from './fireUtils'

interface AssetFireEffectsProps {
  fires: FireInstance[]

  scale?: number
}





export const AssetFireEffects: React.FC<AssetFireEffectsProps> = ({ fires, scale = 1 }) => {
  if (!fires || fires.length === 0) return null

  return (
    <group scale={scale}>
      {fires.map((fire, index) => (
        <RobloxFire
          key={`fire-${index}`}
          enabled={fire.enabled}
          color={fire.color}
          secondaryColor={fire.secondaryColor}
          size={fire.size}
          heat={fire.heat}
          position={[
            fire.position.x * 0.1,
            fire.position.y * 0.1,
            fire.position.z * 0.1
          ]}
          parentSize={[fire.parentSize.x * 0.1, fire.parentSize.y * 0.1, fire.parentSize.z * 0.1]}
        />
      ))}
    </group>
  )
}

export default AssetFireEffects