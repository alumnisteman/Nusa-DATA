export type PHKStatus =
  | "RECENT"
  | "RECOVERING"
  | "RETRAINING"
  | "WORKING"
  | "BUSINESS";

export interface PHKProfile {
  userId: string;
  status: PHKStatus;
  terminationDate?: string;
  previousRole?: string;
  previousIndustry?: string;
  incomeTarget?: number;
  monthlyEssentialExpense?: number;
  dependents?: number;
  location?: string;
}
