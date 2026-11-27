# Build in Docker: the host has no C compiler.
FROM rust:1-bookworm AS build
WORKDIR /src
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release && rm -rf src
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:trixie-slim
RUN useradd --system --uid 10001 app && mkdir -p /data && chown app /data
COPY --from=build /src/target/release/prashnottar-server /usr/local/bin/prashnottar-server
USER app
ENV PORT=8787 DATA_DIR=/data PROJECT_ROOT=/srv
EXPOSE 8787
CMD ["prashnottar-server"]
