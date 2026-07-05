// Shared client-side types mirroring the backend models.

export type Role = "dentist" | "cashier" | "patient";

export type ToothStatus = "healthy" | "treated" | "needs-attention" | "urgent";

export type AppointmentStatus =
  | "pending"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  name: string;
  patientRef: string | null;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tooth {
  id: string;
  patientId: string;
  toothNumber: number;
  status: ToothStatus;
  lastTreatment: string | null;
  lastTreatmentDate: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface Treatment {
  id: string;
  patientId: string;
  toothNumber: number;
  procedure: string;
  notes: string;
  cost: number;
  followUpDate: string | null;
  date: string;
  createdAt: string;
  dentistId: string;
  dentistName: string;
  paid: boolean;
  paidAt: string | null;
  paidBy: string | null;
  paymentMethod: string | null;
  paidAmount: number | null;
  // Joined in billing list endpoint
  patientName?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  type: string;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export type BillingRecord = Treatment;

export interface BillingSummary {
  totalRevenue: number;
  collected: number;
  unpaid: number;
  treatmentCount: number;
  paidCount: number;
  unpaidCount: number;
}

export interface PatientBillingSummary {
  totalCost: number;
  paid: number;
  unpaid: number;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
