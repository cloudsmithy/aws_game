#!/bin/sh
# Run locally on the server as root after review. Does not change Nginx or the live site.
set -eu
if [ "$(id -u)" != 0 ] || [ "$#" -ne 1 ]; then
    echo "Usage: sudo sh deploy/chengdu/setup-server.sh /path/to/dedicated-public-key.pub" >&2
    exit 1
fi
command -v python3 >/dev/null
command -v ssh-keygen >/dev/null
key_file=$(realpath "$1")
ssh-keygen -lf "$key_file" >/dev/null
[ "$(wc -l < "$key_file")" -eq 1 ] || { echo 'Expected one public key line' >&2; exit 1; }
# Strip comments/options; accept a plain Ed25519 key only.
read -r key_type key_data comment < "$key_file"
[ "$key_type" = ssh-ed25519 ] || { echo 'Use a dedicated plain Ed25519 public key' >&2; exit 1; }
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! id aws-game-deploy >/dev/null 2>&1; then
    useradd --system --create-home --home-dir /var/lib/aws-game-deploy --shell /bin/sh aws-game-deploy
fi
install -d -m 0755 /usr/local/lib/aws-game
install -m 0755 "$script_dir/receive.py" /usr/local/lib/aws-game/receive.py
install -d -o aws-game-deploy -g aws-game-deploy -m 0755 /srv/aws-game /srv/aws-game/releases
# User cannot replace the root-managed SSH restrictions.
chown root:root /var/lib/aws-game-deploy
chmod 0755 /var/lib/aws-game-deploy
install -d -o root -g root -m 0755 /var/lib/aws-game-deploy/.ssh
printf 'restrict,command="/usr/bin/python3 /usr/local/lib/aws-game/receive.py" %s %s\n' "$key_type" "$key_data" > /var/lib/aws-game-deploy/.ssh/authorized_keys
chown root:root /var/lib/aws-game-deploy/.ssh/authorized_keys
chmod 0644 /var/lib/aws-game-deploy/.ssh/authorized_keys
echo 'Receiver installed. Existing website and Nginx configuration are unchanged.'
echo 'Next: seed current from the existing site, configure Nginx, and set GitHub Secrets.'
