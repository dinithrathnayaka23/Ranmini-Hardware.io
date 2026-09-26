package lk.ranminihardware.pos.catalog.importing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Reading CSV the way spreadsheets write it, within fixed limits. */
class CsvReaderTest {

  @Test
  @DisplayName("plain rows, CRLF endings and the Excel byte-order mark")
  void plainRows() throws Exception {
    assertThat(readAll("﻿sku,name\r\nA-1,Hammer\r\nA-2,Saw"))
        .containsExactly(List.of("sku", "name"), List.of("A-1", "Hammer"), List.of("A-2", "Saw"));
  }

  @Test
  @DisplayName("quoted values keep their commas, quotes and line breaks")
  void quotedValues() throws Exception {
    assertThat(readAll("a,\"b, c\",\"say \"\"hi\"\"\",\"two\nlines\"\n"))
        .containsExactly(List.of("a", "b, c", "say \"hi\"", "two\nlines"));
  }

  @Test
  @DisplayName("empty fields and blank lines are kept, so line numbers stay right")
  void emptiesAndBlankLines() throws Exception {
    assertThat(readAll("a,,c\n\nd,e,\n"))
        .containsExactly(List.of("a", "", "c"), List.of(), List.of("d", "e", ""));
  }

  @Test
  @DisplayName("an unclosed quote is an error, not a silent swallow of the rest of the file")
  void unclosedQuote() {
    assertThatThrownBy(() -> readAll("a,\"never closed\nb,c\n"))
        .isInstanceOf(CsvReader.CsvException.class);
  }

  @Test
  @DisplayName("a field beyond the size limit is refused")
  void oversizedField() {
    String huge = "x".repeat(CsvReader.MAX_FIELD_LENGTH + 1);
    assertThatThrownBy(() -> readAll("a," + huge + "\n"))
        .isInstanceOf(CsvReader.CsvException.class);
  }

  @Test
  @DisplayName("more rows than allowed is refused")
  void tooManyRows() {
    assertThatThrownBy(() -> readAll("a\nb\nc\n", 2)).isInstanceOf(CsvReader.CsvException.class);
  }

  private static List<List<String>> readAll(String csv) throws Exception {
    return readAll(csv, 1000);
  }

  private static List<List<String>> readAll(String csv, int maxRows) throws Exception {
    CsvReader reader = new CsvReader(new StringReader(csv), maxRows);
    List<List<String>> rows = new ArrayList<>();
    List<String> row;
    while ((row = reader.next()) != null) rows.add(row);
    return rows;
  }
}
