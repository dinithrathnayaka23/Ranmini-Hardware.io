package lk.ranminihardware.pos.shared.sequence;

import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.ReturnDocument;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Gap-free, strictly increasing counters — used for invoice numbers.
 *
 * <p>A receipt number has to be sequential and must not repeat: it is what a
 * customer quotes in a dispute and what an auditor follows. That rules out the
 * usual alternatives. A UUID is not sequential. A timestamp collides when two
 * tills ring up in the same millisecond. Counting existing documents is both
 * racy and slower every year.
 *
 * <p>So the number comes from an atomic {@code $inc} with upsert: the database
 * hands each caller a distinct value in one round trip, with no read-then-write
 * to race.
 *
 * <p><b>Known limitation.</b> Each counter is one document, so it is a
 * serialisation point — every till taking a number waits its turn on the same
 * row. That is fine here by a wide margin: the counters are per day, and a
 * hardware shop does not write thousands of invoices a second. If the business
 * ever outgrows it, the fix is a per-terminal counter with the terminal id in
 * the number, not a looser guarantee.
 */
@Component
public class SequenceGenerator {

  private static final String COLLECTION = "counters";

  private final MongoTemplate mongo;

  public SequenceGenerator(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  /**
   * Returns the next value for {@code key}, starting at 1.
   *
   * @param key counter name, e.g. "invoice:2026-08-31"
   */
  public long next(String key) {
    Document result =
        mongo
            .getCollection(COLLECTION)
            .findOneAndUpdate(
                new Document("_id", key),
                new Document("$inc", new Document("value", 1L)),
                new FindOneAndUpdateOptions()
                    .upsert(true)
                    .returnDocument(ReturnDocument.AFTER));

    // Upsert with returnAfter always yields a document; the fallback exists so
    // a driver change can never silently hand back a duplicate zero.
    if (result == null || !(result.get("value") instanceof Number value)) {
      throw new IllegalStateException("Counter %s did not return a value".formatted(key));
    }
    return value.longValue();
  }
}
