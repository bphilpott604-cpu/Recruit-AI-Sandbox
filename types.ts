
export interface GeneratedAssets {
  jobDescription: string;
  interviewGuide: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
