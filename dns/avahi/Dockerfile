FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends avahi-daemon avahi-utils && \
    rm -rf /var/lib/apt/lists/*

COPY avahi-daemon.conf /etc/avahi/avahi-daemon.conf

CMD ["avahi-daemon", "--no-drop-root", "--no-rlimits", "-f", "/etc/avahi/avahi-daemon.conf"]
