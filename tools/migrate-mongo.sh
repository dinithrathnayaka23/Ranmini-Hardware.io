#!/usr/bin/env bash
#
# Copies one MongoDB database into another.
#
#   ./tools/migrate-mongo.sh <source-uri> <target-uri> [--overwrite]
#
# Example — this laptop's local database up to an Atlas cluster:
#
#   ./tools/migrate-mongo.sh \
#     "mongodb://localhost:27017/ranmini_final2" \
#     "mongodb+srv://user:pass@cluster.mongodb.net/ranmini_pos?retryWrites=true&w=majority"
#
# Quote both URIs. An Atlas connection string contains & and ? which the shell
# would otherwise treat as its own.
#
# No install needed: the MongoDB driver is lifted out of the backend's built
# jar, so the only requirements are Java and a backend that has been packaged
# at least once (mvn -o package -DskipTests).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"
jar="$root/backend/target/pos-backend-0.1.0-SNAPSHOT.jar"

if [ ! -f "$jar" ]; then
  echo "Backend jar not found at $jar" >&2
  echo "Build it first:  (cd backend && mvn -o package -DskipTests)" >&2
  exit 1
fi

# Extracted into a temporary directory that is removed on the way out, so the
# repository never accumulates loose jars.
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

unzip -o -j "$jar" \
  "BOOT-INF/lib/mongodb-driver-*.jar" \
  "BOOT-INF/lib/bson*.jar" \
  -d "$work" > /dev/null

cp "$here/MigrateMongo.java" "$work/"

# Windows separates classpath entries with ';', everything else with ':'.
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) sep=";" ;;
  *) sep=":" ;;
esac

# Bare filenames, not absolute paths. On Git Bash the `java` on PATH is the
# Windows binary and cannot read a /tmp/... style path, so change into the
# work directory first and let the names resolve there.
cd "$work"
classpath="$(ls *.jar | tr '\n' "$sep")."

java -cp "$classpath" MigrateMongo.java "$@"
