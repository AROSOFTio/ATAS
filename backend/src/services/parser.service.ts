import csvParser from "csv-parser";
import pdf from "pdf-parse";
import { Readable } from "stream";
import { TimetableEntryInput } from "../types";

type ParsedFileResult = {
  extractedText: string;
  entries: TimetableEntryInput[];
};

type CsvRow = Record<string, string>;

export class ParserService {
  async parseFile(buffer: Buffer, mimeType: string, originalName: string): Promise<ParsedFileResult> {
    const extension = originalName.split(".").pop()?.toLowerCase();

    if (mimeType === "application/pdf" || extension === "pdf") {
      const data = await pdf(buffer);
      const extractedText = data.text ?? "";
      return {
        extractedText,
        entries: this.parseTextEntries(extractedText)
      };
    }

    if (mimeType === "text/csv" || mimeType === "application/vnd.ms-excel" || extension === "csv") {
      const rows = await this.parseCsvRows(buffer);
      const entries = rows.map((row) => this.mapCsvRowToEntry(row));
      const extractedText = rows
        .map((row) => Object.values(row).filter(Boolean).join(" | "))
        .join("\n");

      return {
        extractedText,
        entries
      };
    }

    const extractedText = buffer.toString("utf-8");
    return {
      extractedText,
      entries: this.parseTextEntries(extractedText)
    };
  }

  private async parseCsvRows(buffer: Buffer) {
    return new Promise<CsvRow[]>((resolve, reject) => {
      const rows: CsvRow[] = [];

      Readable.from([buffer.toString("utf-8")])
        .pipe(csvParser())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows))
        .on("error", reject);
    });
  }

  private mapCsvRowToEntry(row: CsvRow): TimetableEntryInput {
    const getValue = (...keys: string[]) =>
      keys.map((key) => row[key]).find((value) => value !== undefined && `${value}`.trim() !== "")?.trim() ?? null;

    const startTime = getValue("start_time", "startTime", "time_start");
    const endTime = getValue("end_time", "endTime", "time_end");

    return {
      course_code: getValue("course_code", "courseCode", "code"),
      course_title: getValue("course_title", "courseTitle", "title"),
      programme: getValue("programme", "program", "program_code"),
      year_semester: getValue("year_semester", "yearSemester", "year"),
      study_mode: getValue("study_mode", "studyMode", "mode"),
      exam_date: getValue("exam_date", "date"),
      session: getValue("session") ?? this.combineSession(startTime, endTime),
      start_time: startTime,
      end_time: endTime,
      invigilator: getValue("invigilator", "supervisor"),
      phone: getValue("phone", "telephone", "contact"),
      number_of_students: this.toNullableInt(getValue("number_of_students", "students", "student_count")),
      room: getValue("room", "venue"),
      raw_text: JSON.stringify(row)
    };
  }

  parseTextEntries(text: string) {
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines
      .map((line) => this.parseTextLine(line))
      .filter((entry): entry is TimetableEntryInput => Boolean(entry));
  }

  private parseTextLine(line: string): TimetableEntryInput | null {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (normalized.length < 6) {
      return null;
    }

    if (normalized.includes("|")) {
      return this.parsePipeSeparatedLine(normalized);
    }

    const courseCode = this.matchCourseCode(normalized);
    const dateMatch = normalized.match(/\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/i);
    const detailedTime = normalized.match(
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
    );
    const compactTime = normalized.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\s*(am|pm)\b/i);
    const phone = normalized.match(/(\+?\d[\d\s-]{8,}\d)/)?.[1]?.replace(/\s+/g, "");
    const studentCount = this.extractTrailingStudentCount(normalized, phone);

    const timeData = detailedTime
      ? {
          start: detailedTime[1],
          end: detailedTime[2]
        }
      : compactTime
        ? {
            start: `${compactTime[1]} ${compactTime[3]}`,
            end: `${compactTime[2]} ${compactTime[3]}`
          }
        : {
            start: null,
            end: null
          };

    const markers = [dateMatch?.index, detailedTime?.index, compactTime?.index].filter(
      (value): value is number => value !== undefined
    );

    const cutoff = markers.length ? Math.min(...markers) : normalized.length;
    const courseTitle = courseCode
      ? normalized
          .slice(normalized.indexOf(courseCode) + courseCode.length)
          .replace(/^[\s\-:|]+/, "")
          .slice(0, Math.max(cutoff - normalized.indexOf(courseCode) - courseCode.length, 0))
          .replace(/[\s\-:|]+$/, "")
      : null;

    const room = this.extractRoom(normalized, studentCount, phone);
    const invigilator = this.extractInvigilator(normalized, courseTitle, dateMatch?.[0] ?? null, timeData.start);

    return {
      course_code: courseCode,
      course_title: courseTitle || null,
      programme: this.extractProgramme(normalized),
      year_semester: this.extractYearSemester(normalized),
      study_mode: this.extractStudyMode(normalized),
      exam_date: dateMatch?.[0] ?? null,
      session: this.combineSession(timeData.start, timeData.end),
      start_time: timeData.start,
      end_time: timeData.end,
      invigilator,
      phone: phone ?? null,
      number_of_students: studentCount,
      room,
      raw_text: normalized
    };
  }

  private parsePipeSeparatedLine(line: string): TimetableEntryInput {
    const parts = line.split("|").map((part) => part.trim());
    const [
      leftDescriptor = "",
      examDate = "",
      session = "",
      courseSection = "",
      invigilator = "",
      phone = "",
      count = "",
      room = ""
    ] = parts;

    const courseCode = this.matchCourseCode(courseSection);
    const courseTitle = courseCode
      ? courseSection.replace(courseCode, "").replace(/^[\s\-:]+/, "").trim()
      : courseSection;
    const sessionMatch = session.match(
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
    );

    return {
      course_code: courseCode,
      course_title: courseTitle || null,
      programme: this.extractProgramme(leftDescriptor),
      year_semester: this.extractYearSemester(leftDescriptor),
      study_mode: this.extractStudyMode(leftDescriptor),
      exam_date: examDate || null,
      session: session || null,
      start_time: sessionMatch?.[1] ?? null,
      end_time: sessionMatch?.[2] ?? null,
      invigilator: invigilator || null,
      phone: phone || null,
      number_of_students: this.toNullableInt(count),
      room: room || null,
      raw_text: line
    };
  }

  private combineSession(startTime: string | null, endTime: string | null) {
    if (!startTime && !endTime) {
      return null;
    }

    return [startTime, endTime].filter(Boolean).join(" - ");
  }

  private matchCourseCode(text: string) {
    return text.match(/\b([A-Z]{2,}\d{3,}[A-Z]?)\b/)?.[1] ?? null;
  }

  private extractProgramme(text: string) {
    return text.match(/\b(BIT|DIT|CS|BCS|BSCIT|BSCS|ITE)\b/i)?.[1]?.toUpperCase() ?? null;
  }

  private extractYearSemester(text: string) {
    return text.match(/\b(\d:\d|Year\s*\d+\s*Semester\s*\d+)\b/i)?.[1] ?? null;
  }

  private extractStudyMode(text: string) {
    return text.match(/\b(Weekend|Day|Evening|Online)\b/i)?.[1] ?? null;
  }

  private extractTrailingStudentCount(text: string, phone?: string) {
    if (!phone) {
      return this.toNullableInt(text.match(/\b(\d{1,3})\b(?!.*\b\d{1,3}\b)/)?.[1] ?? null);
    }

    const phoneIndex = text.indexOf(phone);
    const tail = phoneIndex >= 0 ? text.slice(phoneIndex + phone.length) : text;
    return this.toNullableInt(tail.match(/\b(\d{1,3})\b/)?.[1] ?? null);
  }

  private extractRoom(text: string, studentCount: number | null, phone?: string) {
    let tail = text;
    if (phone && text.includes(phone)) {
      tail = text.slice(text.indexOf(phone) + phone.length);
    }

    if (studentCount !== null) {
      const countIndex = tail.indexOf(String(studentCount));
      if (countIndex >= 0) {
        tail = tail.slice(countIndex + String(studentCount).length);
      }
    }

    const room = tail.replace(/^[\s|:-]+/, "").trim();
    return room || null;
  }

  private extractInvigilator(text: string, courseTitle: string | null, examDate: string | null, startTime: string | null) {
    let working = text;

    if (courseTitle) {
      working = working.replace(courseTitle, " ");
    }
    if (examDate) {
      working = working.replace(examDate, " ");
    }
    if (startTime) {
      working = working.replace(startTime, " ");
    }

    const invigilatorMatch = working.match(/\b(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}\b/);
    return invigilatorMatch?.[0] ?? null;
  }

  private toNullableInt(value: string | null) {
    if (!value) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
}

export const parserService = new ParserService();
