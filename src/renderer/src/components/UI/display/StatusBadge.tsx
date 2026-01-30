import React from 'react'
import { AccountStatus } from '../../../types'
import { Badge } from './Badge'
import { getStatusBorderColor, getStatusColor } from '../../../utils/statusUtils'

interface StatusBadgeProps {
  status: AccountStatus
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {


  return (
    <Badge variant={status as any}>
      <span
        className={`w-1.5 h-1.5 rounded-full border border-solid ${getStatusBorderColor(status)} ${getStatusColor(status)} animate-pulse`}
      />
      {status}
    </Badge>
  )
}

export default StatusBadge