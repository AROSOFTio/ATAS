import { supabase } from "../lib/supabase";
import { TimetableEntryInput, TimetableIssueInput } from "../types";

type EntryRow = TimetableEntryInput & { id: string };

export class AnalyzerService {
  async analyzeDocument(documentId: string) {
    const { data: entries, error } = await supabase
      .from("timetable_entries")
      .select("*")
      .eq("document_id", documentId);

    if (error) {
      throw error;
    }

    const typedEntries = (entries ?? []) as EntryRow[];
    const issues = this.buildIssues(typedEntries);

    await supabase.from("timetable_issues").delete().eq("document_id", documentId);

    if (issues.length) {
      const { error: insertError } = await supabase.from("timetable_issues").insert(
        issues.map((issue) => ({
          document_id: documentId,
          ...issue
        }))
      );

      if (insertError) {
        throw insertError;
      }
    }

    return {
      total_entries: typedEntries.length,
      total_issues: issues.length,
      high_issues: issues.filter((issue) => issue.severity === "HIGH").length,
      medium_issues: issues.filter((issue) => issue.severity === "MEDIUM").length,
      low_issues: issues.filter((issue) => issue.severity === "LOW").length,
      issues
    };
  }

  async getIssues(documentId: string) {
    const { data, error } = await supabase
      .from("timetable_issues")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  private buildIssues(entries: EntryRow[]) {
    const issues: TimetableIssueInput[] = [];
    const duplicateMap = new Map<string, EntryRow[]>();
    const invigilatorMap = new Map<string, EntryRow[]>();
    const sessionMap = new Map<string, EntryRow[]>();

    for (const entry of entries) {
      if (!entry.room) {
        issues.push({
          issue_type: "MISSING_ROOM",
          severity: "HIGH",
          title: "Missing room",
          description: `${entry.course_code ?? entry.course_title ?? "This exam"} has no room assigned.`,
          related_entry_id: entry.id
        });
      }

      if (!entry.invigilator) {
        issues.push({
          issue_type: "MISSING_INVIGILATOR",
          severity: "HIGH",
          title: "Missing invigilator",
          description: `${entry.course_code ?? entry.course_title ?? "This exam"} has no invigilator assigned.`,
          related_entry_id: entry.id
        });
      }

      if (!entry.start_time || !entry.end_time) {
        issues.push({
          issue_type: "MISSING_EXAM_TIME",
          severity: "HIGH",
          title: "Missing exam time",
          description: `${entry.course_code ?? entry.course_title ?? "This exam"} is missing a start or end time.`,
          related_entry_id: entry.id
        });
      }

      if ((entry.number_of_students ?? 0) > 50) {
        issues.push({
          issue_type: "HIGH_STUDENT_COUNT",
          severity: "MEDIUM",
          title: "High student count",
          description: `${entry.course_code ?? entry.course_title ?? "This exam"} has ${entry.number_of_students} students.`,
          related_entry_id: entry.id
        });
      }

      const duplicateKey = [
        entry.course_code ?? entry.course_title ?? "UNKNOWN",
        entry.exam_date ?? "UNKNOWN",
        entry.start_time ?? "UNKNOWN",
        entry.room ?? "UNKNOWN"
      ].join("|");

      duplicateMap.set(duplicateKey, [...(duplicateMap.get(duplicateKey) ?? []), entry]);

      if (entry.invigilator && entry.exam_date && entry.start_time) {
        const invigilatorKey = `${entry.invigilator}|${entry.exam_date}|${entry.start_time}`;
        invigilatorMap.set(invigilatorKey, [...(invigilatorMap.get(invigilatorKey) ?? []), entry]);
      }

      if (entry.exam_date && (entry.session || entry.start_time)) {
        const sessionKey = `${entry.exam_date}|${entry.session ?? entry.start_time}`;
        sessionMap.set(sessionKey, [...(sessionMap.get(sessionKey) ?? []), entry]);
      }
    }

    for (const duplicates of duplicateMap.values()) {
      if (duplicates.length > 1) {
        duplicates.forEach((entry) => {
          issues.push({
            issue_type: "DUPLICATE_COURSE_ENTRY",
            severity: "MEDIUM",
            title: "Duplicate course entry",
            description: `${entry.course_code ?? entry.course_title ?? "Exam"} appears more than once in the same slot.`,
            related_entry_id: entry.id
          });
        });
      }
    }

    for (const rows of invigilatorMap.values()) {
      if (rows.length > 1) {
        rows.forEach((entry) => {
          issues.push({
            issue_type: "INVIGILATOR_CONFLICT",
            severity: "HIGH",
            title: "Invigilator conflict",
            description: `${entry.invigilator} is assigned to multiple exams at ${entry.start_time} on ${entry.exam_date}.`,
            related_entry_id: entry.id
          });
        });
      }
    }

    for (const rows of sessionMap.values()) {
      if (rows.length >= 3) {
        rows.forEach((entry) => {
          issues.push({
            issue_type: "OVERLOADED_SESSION",
            severity: "LOW",
            title: "Overloaded session",
            description: `${rows.length} exams are scheduled in the same session on ${entry.exam_date}.`,
            related_entry_id: entry.id
          });
        });
      }
    }

    return issues;
  }
}

export const analyzerService = new AnalyzerService();
