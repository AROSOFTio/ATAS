export type TimetableEntryInput = {
  course_code: string | null;
  course_title: string | null;
  programme: string | null;
  year_semester: string | null;
  study_mode: string | null;
  exam_date: string | null;
  session: string | null;
  start_time: string | null;
  end_time: string | null;
  invigilator: string | null;
  phone: string | null;
  number_of_students: number | null;
  room: string | null;
  raw_text: string;
};

export type TimetableIssueInput = {
  issue_type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  related_entry_id?: string | null;
};

export type RetrievedChunk = {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type QuestionIntent = {
  programme?: string;
  year_semester?: string;
  study_mode?: string;
  course_code?: string;
  course_title?: string;
  asksFor?: string[];
  dateQuery?: string;
};

