
export interface AnalysisFile {
  id: string;
  name: string;
  content: string;
  type: string;
  uploadDate: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  groundingUrls?: { title: string; uri: string }[];
}

export interface ReportDraft {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}
