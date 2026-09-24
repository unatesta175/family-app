# Deploying to a VPS with CI/CD

This app ships as a Docker container. GitHub Actions builds and deploys it to your VPS automatically on every push to `main`.

## One time VPS setup

Run these steps once, directly on the VPS (over SSH as a user with sudo access).

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in so the group change takes effect.

### 2. Create a dedicated deploy user

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
```

### 3. Generate a deploy SSH key pair

On the VPS, as the `deploy` user:

```bash
sudo su deploy
ssh-keygen -t ed25519 -C "familyapp deploy key" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519
```

Copy the private key output (the whole block including the BEGIN/END lines). This goes into a GitHub secret named `VPS_SSH_KEY`, never anywhere else.

### 4. Clone the repo on the VPS

```bash
cd /home/deploy
git clone https://github.com/unatesta175/family-app.git familyapp
cd familyapp
docker compose build
docker compose up -d
```

Confirm it works by visiting `http://YOUR_VPS_IP:3000`.

Put a reverse proxy (Caddy, Nginx, or Traefik) in front of it for a real domain and HTTPS; that is outside the scope of this file.

## GitHub repository secrets

In the GitHub repo, go to Settings, then Secrets and variables, then Actions, and add:

| Secret name | Value |
| --- | --- |
| VPS_HOST | your VPS IP or hostname |
| VPS_USER | `deploy` |
| VPS_PORT | your SSH port, usually `22` |
| VPS_SSH_KEY | the private key generated in step 3 |
| VPS_APP_DIR | absolute path to the clone on the VPS, e.g. `/home/deploy/familyapp` |

## How the pipeline works

Every push to `main` triggers `.github/workflows/deploy.yml`, which:

1. Connects to the VPS over SSH using the secrets above.
2. Pulls the latest `main` branch into the app directory.
3. Rebuilds the Docker image and restarts the container with `docker compose`.
4. Prunes old, unused Docker images.

The SQLite database file lives in a named Docker volume (`familyapp_data`), so it survives rebuilds and redeploys.

## Manual deploy

You can also trigger a deploy without pushing code from the Actions tab in GitHub, using the "Deploy to VPS" workflow's "Run workflow" button (this repo's workflow is configured with `workflow_dispatch`).

Or deploy by hand on the VPS itself:

```bash
cd /home/deploy/familyapp
git pull
docker compose build
docker compose up -d
```
