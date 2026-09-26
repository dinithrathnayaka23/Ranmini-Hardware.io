package lk.ranminihardware.pos.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The words a product is found by, and the words a search is made of.
 *
 * <p>Both come from the same rules; these pin that they line up, because a
 * mismatch is silent — a product simply stops turning up.
 */
class SearchKeysTest {

  @Test
  @DisplayName("name, brand and SKU are split into lower-case words, once each")
  void productKeys() {
    assertThat(SearchKeys.forProduct("Portland Cement 50kg", "Tokyo", "CEM-001"))
        .containsExactly("portland", "cement", "50kg", "tokyo", "cem", "001");
  }

  @Test
  @DisplayName("repeated words are stored once")
  void duplicatesCollapse() {
    assertThat(SearchKeys.forProduct("Tokyo Cement", "Tokyo", null))
        .containsExactly("tokyo", "cement");
  }

  @Test
  @DisplayName("sizes and symbols split into their parts, as a cashier types them")
  void punctuationSeparates() {
    assertThat(SearchKeys.forProduct("PVC Pipe 1/2\" x 3m", null, "PVC-12/3"))
        .containsExactly("pvc", "pipe", "1", "2", "x", "3m", "12", "3");
  }

  @Test
  @DisplayName("Sinhala words keep their vowel signs, rather than falling apart into consonants")
  void sinhalaWordsStayWhole() {
    assertThat(SearchKeys.forProduct("සිමෙන්ති බෑගය", null, null))
        .containsExactly("සිමෙන්ති", "බෑගය");
  }

  @Test
  @DisplayName("a Sinhala conjunct joined with a zero-width joiner stays one word")
  void sinhalaConjunct() {
    assertThat(SearchKeys.forProduct("ශ්‍රී ලංකා", null, null))
        .containsExactly("ශ්‍රී", "ලංකා");
  }

  @Test
  @DisplayName("Tamil words keep their vowel signs too")
  void tamilWordsStayWhole() {
    assertThat(SearchKeys.forProduct("சிமெண்ட் பை", null, null)).containsExactly("சிமெண்ட்", "பை");
  }

  @Test
  @DisplayName("a partial Sinhala word is a prefix of the stored one, so type-ahead works")
  void sinhalaPrefix() {
    assertThat(SearchKeys.forProduct("සිමෙන්ති", null, null).get(0))
        .startsWith(SearchKeys.termsOf("සිමෙ").get(0));
  }

  @Test
  @DisplayName("a search is normalised the same way as the stored keys")
  void termsMatchKeys() {
    assertThat(SearchKeys.termsOf("  Portland   CEM ")).containsExactly("portland", "cem");
  }

  @Test
  @DisplayName("a search never yields anything but letters and digits")
  void termsAreSafeForPatterns() {
    assertThat(SearchKeys.termsOf("ce.*m(^$)|[a]+"))
        .isNotEmpty()
        .allMatch(term -> term.matches("[\\p{L}\\p{M}\\p{N}\\u200C\\u200D]+"));
  }

  @Test
  @DisplayName("a long search is cut to a few words")
  void termCountIsBounded() {
    assertThat(SearchKeys.termsOf("a b c d e f g h")).hasSize(SearchKeys.MAX_TERMS);
  }

  @Test
  @DisplayName("an empty or missing search has no terms")
  void emptySearch() {
    assertThat(SearchKeys.termsOf("  ")).isEmpty();
    assertThat(SearchKeys.termsOf(null)).isEmpty();
  }
}
