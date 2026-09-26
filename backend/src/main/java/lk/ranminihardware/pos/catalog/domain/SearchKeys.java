package lk.ranminihardware.pos.catalog.domain;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The words a product can be found by, and the words a search is made of.
 *
 * <p><b>Why not MongoDB's text index.</b> It matches whole words only, so a
 * cashier typing "cem" found nothing until they had finished spelling
 * "cement", and a two-word search matched products containing <em>either</em>
 * word. A till is searched a few letters at a time, so neither is acceptable.
 *
 * <p>Instead every product stores its lower-cased words in {@code searchKeys},
 * with an ordinary multikey index on that array. A search term becomes an
 * anchored prefix pattern ({@code ^cem}), which MongoDB answers with a bounded
 * range scan of that index — the same cost as an exact lookup — and a search of
 * several words requires every word to match.
 *
 * <p>Both sides are produced here, from the same rules, so what is stored and
 * what is searched for cannot drift apart.
 */
public final class SearchKeys {

  /**
   * Anything that is not part of a word, in any script, separates words.
   *
   * <p>"Part of a word" is a letter, a digit, or a combining mark — and the
   * marks matter. Sinhala and Tamil write most vowels as marks attached to a
   * consonant (the ි and ් in සිමෙන්ති), so without them a Sinhala product
   * name fell apart into single consonants. The zero-width joiner and non-joiner
   * are kept for the same reason: Sinhala uses them inside words, as in ශ්‍රී.
   */
  private static final Pattern SEPARATOR =
      Pattern.compile("[^\\p{L}\\p{M}\\p{N}\\u200C\\u200D]+");

  /**
   * Beyond this, extra search words add nothing but work. Also bounds the size
   * of the query a caller can make the database evaluate.
   */
  public static final int MAX_TERMS = 5;

  /** Longer words are stored and matched on their first this-many characters. */
  private static final int MAX_KEY_LENGTH = 40;

  private SearchKeys() {}

  /** The keys stored on a product: its name, brand and SKU, split into words. */
  public static List<String> forProduct(String name, String brand, String sku) {
    Set<String> keys = new LinkedHashSet<>();
    addWords(keys, name);
    addWords(keys, brand);
    addWords(keys, sku);
    return List.copyOf(keys);
  }

  /**
   * The words of a search, normalised exactly as stored keys are.
   *
   * <p>Returns only letters, marks and digits, so a term can go into a regular
   * expression without being able to change its meaning; the query builder
   * escapes it regardless.
   */
  public static List<String> termsOf(String query) {
    Set<String> terms = new LinkedHashSet<>();
    addWords(terms, query);
    List<String> result = new ArrayList<>(terms);
    return result.size() > MAX_TERMS ? List.copyOf(result.subList(0, MAX_TERMS)) : List.copyOf(result);
  }

  private static void addWords(Set<String> into, String text) {
    if (text == null || text.isBlank()) return;
    for (String word : SEPARATOR.split(text.toLowerCase(Locale.ROOT))) {
      if (word.isEmpty()) continue;
      into.add(word.length() > MAX_KEY_LENGTH ? word.substring(0, MAX_KEY_LENGTH) : word);
    }
  }
}
