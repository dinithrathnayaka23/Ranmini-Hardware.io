import com.mongodb.client.*;
import com.mongodb.client.model.InsertManyOptions;
import java.util.ArrayList;
import java.util.List;
import org.bson.Document;

/**
 * Copies one MongoDB database into another.
 *
 * <p>Written because the shop's data has to move from the laptop's local mongod
 * to a hosted cluster, and the usual tool for that — mongodump/mongorestore —
 * is a separate 100MB download that is not installed here. The MongoDB driver
 * is already inside the backend's jar, so this needs nothing new.
 *
 *   java -cp "<driver jars>;." MigrateMongo.java <source-uri> <target-uri>
 *
 * Both URIs must include the database name. See tools/migrate-mongo.sh, which
 * assembles the classpath and is the intended way to run this.
 *
 * <p><b>It refuses to write into a database that already holds data.</b> The
 * one thing a migration must never do is half-overwrite a live shop, and the
 * cost of that guard is having to say so explicitly with --overwrite when a
 * repeat run is genuinely what you want.
 *
 * <p>Indexes are deliberately NOT copied. The service declares every index it
 * needs in MongoIndexInitializer and builds them at startup, so they arrive
 * correctly the first time the backend points at the new database — and
 * copying them here would create a second definition that could drift from the
 * one in the code.
 */
public class MigrateMongo {

  /** Documents per insert. Large enough to be quick, small enough to stay well
      inside the 16MB message limit even with product images in the batch. */
  private static final int BATCH = 200;

  public static void main(String[] args) {
    if (args.length < 2) {
      System.err.println("usage: MigrateMongo <source-uri> <target-uri> [--overwrite]");
      System.exit(2);
    }

    String sourceUri = args[0];
    String targetUri = args[1];
    boolean overwrite = args.length > 2 && args[2].equals("--overwrite");

    try (MongoClient source = MongoClients.create(sourceUri);
        MongoClient target = MongoClients.create(targetUri)) {

      MongoDatabase from = source.getDatabase(databaseOf(sourceUri));
      MongoDatabase to = target.getDatabase(databaseOf(targetUri));

      System.out.printf("from : %s%n", describe(sourceUri));
      System.out.printf("to   : %s%n%n", describe(targetUri));

      List<String> collections = new ArrayList<>();
      from.listCollectionNames().forEach(collections::add);

      if (collections.isEmpty()) {
        System.out.println("Source database is empty. Nothing to do.");
        return;
      }

      guardTarget(to, overwrite);

      long grandTotal = 0;
      for (String name : collections) {
        long copied = copy(from.getCollection(name), to.getCollection(name), overwrite);
        grandTotal += copied;
        System.out.printf("  %-24s %6d%n", name, copied);
      }

      System.out.printf("%nCopied %d documents across %d collections.%n",
          grandTotal, collections.size());
      verify(from, to, collections);
    }
  }

  /** Stops a migration that would land on top of existing data. */
  private static void guardTarget(MongoDatabase to, boolean overwrite) {
    if (overwrite) return;

    for (String name : to.listCollectionNames()) {
      if (to.getCollection(name).countDocuments() > 0) {
        throw new IllegalStateException(
            "Target already holds data (collection '" + name + "'). "
                + "Re-run with --overwrite if replacing it is genuinely what you want.");
      }
    }
  }

  private static long copy(
      MongoCollection<Document> from, MongoCollection<Document> to, boolean overwrite) {

    if (overwrite) to.drop();

    List<Document> batch = new ArrayList<>(BATCH);
    long copied = 0;

    for (Document doc : from.find()) {
      batch.add(doc);
      if (batch.size() == BATCH) {
        copied += flush(to, batch);
      }
    }
    copied += flush(to, batch);
    return copied;
  }

  private static long flush(MongoCollection<Document> to, List<Document> batch) {
    if (batch.isEmpty()) return 0;

    // Unordered so one unexpected duplicate cannot abandon the rest of a batch.
    to.insertMany(batch, new InsertManyOptions().ordered(false));
    long n = batch.size();
    batch.clear();
    return n;
  }

  /** Counts both sides afterwards, because a migration nobody checked is a hope. */
  private static void verify(MongoDatabase from, MongoDatabase to, List<String> collections) {
    System.out.println("\nVerifying:");
    boolean ok = true;

    for (String name : collections) {
      long before = from.getCollection(name).countDocuments();
      long after = to.getCollection(name).countDocuments();
      boolean match = before == after;
      ok &= match;
      System.out.printf("  %-24s source %6d   target %6d   %s%n",
          name, before, after, match ? "ok" : "MISMATCH");
    }

    System.out.println(ok
        ? "\nEvery collection matches."
        : "\nSOME COLLECTIONS DO NOT MATCH — do not point the app at the target yet.");

    if (!ok) System.exit(1);
  }

  /** The database name out of a connection string. */
  private static String databaseOf(String uri) {
    int start = uri.indexOf('/', uri.indexOf("//") + 2);
    if (start < 0) throw new IllegalArgumentException("URI has no database name: " + describe(uri));

    String rest = uri.substring(start + 1);
    int query = rest.indexOf('?');
    String name = query < 0 ? rest : rest.substring(0, query);

    if (name.isBlank()) throw new IllegalArgumentException("URI has no database name: " + describe(uri));
    return name;
  }

  /** A URI safe to print: credentials removed. */
  private static String describe(String uri) {
    int scheme = uri.indexOf("//");
    int at = uri.lastIndexOf('@');
    if (scheme < 0 || at < 0) return uri;
    return uri.substring(0, scheme + 2) + "<credentials hidden>" + uri.substring(at);
  }
}
