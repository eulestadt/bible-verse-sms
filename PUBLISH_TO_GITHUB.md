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

GitHub will show “push an existing repository from the command line.” Use your repo URL (replace `YOUR_USERNAME` with your GitHub username):

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bible-verse-sms.git
git push -u origin main
```

If GitHub prompts for login, use a [Personal Access Token](https://github.com/settings/tokens) as the password (or use SSH if you have it set up).

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
