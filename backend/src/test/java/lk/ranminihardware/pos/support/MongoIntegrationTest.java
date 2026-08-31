package lk.ranminihardware.pos.support;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class for tests that need a real MongoDB.
 *
 * <p><b>A real database, not a mock.</b> The behaviour this service depends on
 * most — a conditional update that must be atomic, a unique index that must
 * reject a duplicate, an aggregation pipeline that must sum Decimal128 — is
 * exactly what an in-memory fake gets wrong. Two bugs found while building this
 * (an id type mismatch in a raw filter, and an exclusive date range) were
 * invisible to compilation and would have been invisible to a mock.
 *
 * <p>The container is static, so one MongoDB is started for the whole test run
 * rather than one per class. Starting a database per test class turns a fast
 * suite into one nobody runs.
 */
@Testcontainers
@SpringBootTest
@Tag("integration")
public abstract class MongoIntegrationTest {

  static final MongoDBContainer MONGO =
      new MongoDBContainer(DockerImageName.parse("mongo:7"))
          // Reused across every test class in the run.
          .withReuse(false);

  static {
    MONGO.start();
  }

  @DynamicPropertySource
  static void mongoProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
    // The seeder must never run in a test: tests create exactly the data they
    // assert on, and a background fixture appearing underneath them is how a
    // suite becomes order-dependent.
    registry.add("ranmini.seed.enabled", () -> "false");
  }
}
