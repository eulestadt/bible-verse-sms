# Publish Bible Verse SMS to GitHub

Follow these steps in your terminal. You’ll need a [GitHub account](https://github.com/join) and [Git](https://git-scm.com/) installed.

---

## 1. Initialize Git and make the first commit

From the project folder:

```bash
cd /Users/phoenixwang/bible-verse-sms

# Initialize repo
git init

# Add all files (node_modules and .env are ignored by .gitignore)
git add -A
git status   # optional: check what will be committed

# First commit
git commit -m "Initial commit: Bible Verse SMS (Gemini + API.Bible + Twilio)"
```

---

## 2. Create the repository on GitHub

1. Go to [github.com/new](https://github.com/new).
2. **Repository name:** `bible-verse-sms` (or any name you like).
3. **Description (optional):** e.g. `SMS service: text for a Bible verse (KJV default, ESV/NIV/NASB).`
4. Choose **Public**.
5. **Do not** check “Add a README” (you already have one).
6. Click **Create repository**.

---

## 3. Connect and push

GitHub will show “push an existing repository from the command line.” **Use the URL GitHub shows you** — either is fine:

- **SSH** (e.g. `git@github.com:USERNAME/bible-verse-sms.git`) — uses your SSH key.
- **HTTPS** (e.g. `https://github.com/USERNAME/bible-verse-sms.git`) — prompts for username and password or a [Personal Access Token](https://github.com/settings/tokens) if you have 2FA.

```bash
git branch -M main
git remote add origin <paste the URL from GitHub>
git push -u origin main
```

Example: `git remote add origin git@github.com:eulestadt/bible-verse-sms.git`

---

## 4. After publishing

- **Privacy Policy URL for Twilio A2P:**  
  `https://github.com/YOUR_USERNAME/bible-verse-sms/blob/main/PRIVACY.md`

- **Terms and Conditions URL for Twilio A2P:**  
  `https://github.com/YOUR_USERNAME/bible-verse-sms/blob/main/TERMS.md`

Replace `YOUR_USERNAME` (and `bible-verse-sms` if you used a different repo name).

---

## Optional: Use GitHub CLI

If you use [GitHub CLI](https://cli.github.com/) (`gh`):

```bash
cd /Users/phoenixwang/bible-verse-sms
git init
git add -A
git commit -m "Initial commit: Bible Verse SMS"
gh repo create bible-verse-sms --public --source=. --push
```

This creates the repo and pushes in one step (after you authenticate with `gh auth login` if needed).
