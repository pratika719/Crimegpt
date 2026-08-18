export interface SearchResultDTO {
  id: string;
  type: "CASE" | "DOCUMENT" | "EVIDENCE" | "PERSON" | "ACTIVITY" | "PROFILE";
  title: string;
  subtitle: string;
  description: string;
  url: string;
  badge?: string;
  createdAt: string;
}
