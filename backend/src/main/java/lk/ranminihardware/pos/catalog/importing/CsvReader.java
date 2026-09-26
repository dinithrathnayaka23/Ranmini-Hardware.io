package lk.ranminihardware.pos.catalog.importing;

import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;

/**
 * A small, strict CSV reader (RFC 4180, as Excel and Google Sheets write it).
 *
 * <p>Handles quoted fields, commas and line breaks inside quotes, doubled quotes
 * as an escaped quote, CRLF or LF line endings, and the byte-order mark Excel
 * puts at the start of a UTF-8 file.
 *
 * <p><b>Bounded.</b> A spreadsheet upload is untrusted input, so the reader
 * refuses a field, a row, or a file beyond set sizes rather than growing without
 * limit — a file of one endless quoted field would otherwise be read entirely
 * into memory.
 *
 * <p>Written here rather than pulled in as a dependency because the whole job is
 * this one class, and a parser whose limits are visible is easier to trust with
 * uploaded data than one whose limits have to be looked up.
 */
public final class CsvReader {

  /** Longest field accepted, in characters. Far beyond any real product name. */
  static final int MAX_FIELD_LENGTH = 1_000;

  /** Most columns accepted in a row. */
  static final int MAX_COLUMNS = 40;

  private final Reader in;
  private final int maxRows;
  private int rowsRead;
  private boolean started;
  private int pushedBack = -2;

  public CsvReader(Reader in, int maxRows) {
    this.in = in;
    this.maxRows = maxRows;
  }

  /**
   * The next row, or null at the end of the file.
   *
   * <p>A completely blank line is returned as an empty list, so the caller can
   * skip it while still counting line numbers correctly.
   *
   * @throws CsvException for malformed input or a file over the limits
   */
  public List<String> next() throws IOException {
    int c = read();
    if (!started) {
      started = true;
      if (c == '﻿') c = read(); // Excel's UTF-8 byte-order mark.
    }
    if (c == -1) return null;

    if (++rowsRead > maxRows) {
      throw new CsvException("The file has more than %,d rows.".formatted(maxRows));
    }

    List<String> row = new ArrayList<>();
    StringBuilder field = new StringBuilder();
    boolean quoted = false;
    boolean fieldStarted = false;

    while (true) {
      if (quoted) {
        if (c == -1) throw new CsvException("A quoted value is never closed.");
        if (c == '"') {
          int after = read();
          if (after == '"') {
            append(field, '"');
          } else {
            quoted = false;
            c = after;
            continue;
          }
        } else {
          append(field, (char) c);
        }
      } else {
        if (c == '"' && field.isEmpty() && !fieldStarted) {
          quoted = true;
          fieldStarted = true;
        } else if (c == ',') {
          addField(row, field);
          fieldStarted = false;
        } else if (c == '\r' || c == '\n' || c == -1) {
          if (c == '\r') {
            int after = read();
            if (after != '\n') unread(after);
          }
          if (!row.isEmpty() || !field.isEmpty() || fieldStarted) addField(row, field);
          return row;
        } else {
          append(field, (char) c);
          fieldStarted = true;
        }
      }
      c = read();
    }
  }

  private void addField(List<String> row, StringBuilder field) {
    if (row.size() >= MAX_COLUMNS) {
      throw new CsvException("A row has more than %d columns.".formatted(MAX_COLUMNS));
    }
    row.add(field.toString());
    field.setLength(0);
  }

  private static void append(StringBuilder field, char c) {
    if (field.length() >= MAX_FIELD_LENGTH) {
      throw new CsvException(
          "A value is longer than %,d characters.".formatted(MAX_FIELD_LENGTH));
    }
    field.append(c);
  }

  private int read() throws IOException {
    if (pushedBack != -2) {
      int c = pushedBack;
      pushedBack = -2;
      return c;
    }
    return in.read();
  }

  private void unread(int c) {
    pushedBack = c;
  }

  /** The file cannot be read as CSV, or is over a limit. */
  public static final class CsvException extends RuntimeException {
    public CsvException(String message) {
      super(message);
    }
  }
}
