import React from 'react'
import { SearchInput } from '@renderer/components/UI/inputs/SearchInput'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  placeholder: string
  show?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
  show = true
}) => {
  if (!show) return null

  return (
    <div className="p-4">
      <SearchInput value={searchQuery} onChange={onSearchChange} placeholder={placeholder} />
    </div>
  )
}
