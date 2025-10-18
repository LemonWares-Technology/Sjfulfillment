'use client'

interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function FilterSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "All",
  className = ""
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${className}`}
    >
      <option value="ALL">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
