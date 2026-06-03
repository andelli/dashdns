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
- Use `sudo systemctl restart dnsdist` instead of `reload-or-restart` since reload doesn't work on the target server. Confidence: 0.70

# configuration
- Manage dnsdist SSH server settings (host, port, user, key path) from the dashboard UI instead of via .env file. Confidence: 0.70
- Manage dnsdist API key from the dashboard settings UI instead of via .env file. Confidence: 0.60

# logging
- Add detailed execution logs to deploy operations so users can see what steps were executed. Confidence: 0.70

# deployment
- For DashDNS ACL deploys: Show a diff preview of config changes to the user before submitting the actual deploy. Confidence: 0.80

# acl
- For DashDNS: Simplify ACL page by removing blacklist, enable/disable controls — user only uses whitelist entries. Confidence: 0.75

# responsive
- For DashDNS: Make the full application mobile-responsive (all pages, not just specific features). Confidence: 0.70
- For DashDNS responsive work: Focus on mobile display first before adjusting desktop layout. Confidence: 0.65

# deployment
- For DashDNS: Do not use a reverse proxy (Nginx/Apache) - serve DashDNS directly on its port. Confidence: 0.65
- For recursor-exporter: Deploy pre-compiled binary instead of building on target servers to avoid needing Go compiler on resolvers. Confidence: 0.50
