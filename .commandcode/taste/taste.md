# cli
- Use Bahasa Indonesia for all communications with the user. Confidence: 0.85
- Use `git add -A` and `git commit --amend --no-edit` with `git push -f origin main` for commits. Confidence: 0.70
- Set git author identity via config, not via override commit flags. Confidence: 0.60
- Use `git add README.md` when only updating README. Confidence: 0.65

# security
- Never expose IP addresses in README or documentation - use placeholder variables instead. Confidence: 0.85

# architecture
- Include a system architecture diagram in README. Confidence: 0.70
- For DashDNS: Use Express.js for backend, React+Vite for frontend. Confidence: 0.70

# database
- Include PostgreSQL setup and installation instructions in README. Confidence: 0.65
- Avoid destructive database operations (DELETE/DROP) - prefer non-destructive fixes instead. Confidence: 0.70
- When adding columns via ALTER TABLE in fixes, also update the structural database schema files so new clones get the correct schema. Confidence: 0.80

# deployment
- Include PM2 and systemd service instructions in README. Confidence: 0.65
- Include Nginx reverse proxy configuration example in README. Confidence: 0.60

# ssh
- Use SSH public key authentication (not password) for connecting to remote servers. Confidence: 0.75
- Prefix SSH commands with `sudo` when writing config files or restarting services on remote servers. Confidence: 0.65

# configuration
- Manage dnsdist SSH server settings (host, port, user, key path) from the dashboard UI instead of via .env file. Confidence: 0.70
