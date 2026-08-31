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

    // The service refuses to start without a signing key, deliberately. Tests
    // supply their own throwaway one rather than the code inventing a default,
    // which is exactly the behaviour that would make production unsafe.
    registry.add(
        "ranmini.auth.jwt-secret",
        () -> "test-only-signing-key-that-is-long-enough-to-pass");

    // Administrators are seeded on every startup, including in tests. Given
    // fixed passwords here so a test that needs to sign in has something to use
    // and nothing is written to the log.
    registry.add("ranmini.admin.primary.password", () -> "TestOwnerPassword123");
    registry.add("ranmini.admin.secondary.password", () -> "TestManagerPassword123");
  }
}
