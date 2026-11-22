// Correspond à StudentRequestDTO côté back-end (utilisé pour POST et PUT).
export interface StudentRequest {
  firstName: string,
  lastName: string,
  email: string
}

// Correspond à StudentResponseDTO : les dates arrivent en chaînes JSON (ISO 8601).
export interface Student {
  id: number,
  firstName: string,
  lastName: string,
  email: string,
  createdAt: string,
  updatedAt: string
}
