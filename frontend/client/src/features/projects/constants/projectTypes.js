export const PROJECT_TYPES = [
  { value: 'web_development', label: 'Web Development' },
  { value: 'mobile_application', label: 'Mobile Application' },
  { value: 'system_development', label: 'System Development' },
  { value: 'research', label: 'Research' },
  { value: 'capstone', label: 'Capstone' },
  { value: 'group_programming', label: 'Group Programming' },
  { value: 'individual_programming', label: 'Individual Programming' },
]

export function formatProjectType(value) {
  return PROJECT_TYPES.find((type) => type.value === value)?.label ?? value
}
