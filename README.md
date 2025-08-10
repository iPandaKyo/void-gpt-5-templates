## void-gpt-5-templates

Public templates generated with GPT-5, available for everyone.

### Overview
A curated collection of high-quality templates created using GPT-5 to jumpstart your projects. Most templates are mock-ups that you can transform into fully functional apps with additional prompts.

### Features
- **GPT-5 generated**: Modern, clean code produced with GPT-5
- **Ready-to-use**: Many templates work out of the box
- **Easy customization**: Convert mock-ups to full apps with minimal effort
- **Diverse collection**: Web, mobile, backend, UI components, dashboards, and more
- **Community driven**: Open to contributions and improvements

### Template categories
- **Web applications**: React, Vue, Angular, and vanilla JavaScript
- **Mobile apps**: React Native and PWA starters
- **Backend services**: Node.js, Python, and API templates
- **UI components**: Reusable component libraries and design systems
- **Landing pages**: Marketing and portfolio sites
- **Dashboards**: Admin panels and analytics interfaces

### Getting started
1) **Browse templates** in this repository
2) **Clone** the repo

```bash
git clone https://github.com/voidfnc/void-gpt-5-templates.git
cd void-gpt-5-templates
```

3) **Choose a template** directory (see Template Index below)
4) **Follow the template’s instructions** in its README (or the quickstart notes below)
5) **Customize** using GPT-5 prompts

### Making templates functional (with GPT-5)
- Review the mock-up structure to understand the intended functionality
- Try prompts like:
  - "Convert this mock login form to handle real authentication"
  - "Add database integration to this user management template"
  - "Implement the API calls for this dashboard template"
- Test and iterate with additional prompts for refinements

### Standard template structure
```text
template-name/
├── README.md          # Template-specific instructions
├── src/               # Source code
├── assets/            # Images, fonts, etc.
├── docs/              # Documentation (optional)
└── package.json       # Dependencies (if applicable)
```

## Template index

| Template | Category | Tech | Summary |
|---|---|---|---|
| `gpt5_eduai` | Landing page, Admin dashboard | HTML, CSS, JS (no build tools). CDNs: GSAP, ScrollTrigger, Lenis, VanillaTilt, Swiper, SplitType, Lucide, canvas-confetti, Chart.js | Modern marketing site for an education AI tool with preloader, animated hero, features, demo, testimonials, pricing, FAQ. Includes a mock admin suite: Login/Register, Dashboard (KPIs, charts, users), Analytics, Users (CRUD, filters, bulk, import/export), Settings (org, notifications, SSO, API keys, reset). Light/dark theme with persistence. Client-only mock auth via localStorage. |

### Quickstart: `gpt5_eduai`
- Open `index.html` in a browser (internet connection required for CDNs)
- Sign in flow: `admin-register.html` → create account → redirected to `admin-dashboard.html`
- Dashboard pages: `admin-dashboard.html`, `admin-analytics.html`, `admin-users.html`, `admin-settings.html`
- Data is demo-only (stored in `localStorage`); no real backend

Key files:
- `index.html`: Marketing/landing page with animations and guarded CDN inits
- `auth.js` / `auth.css`: Minimal client-side auth mock, theme, and shared styles
- `admin-*.html`: Admin pages (Login, Register, Dashboard, Analytics, Users, Settings)
- `dashboard.js`, `analytics.js`, `admin-users.js`, `admin-settings.js`, `dashboard.css`: Admin logic, charts, users CRUD, settings, and styling

Known limitations (intended for template/demo use):
- Uses CDNs; offline usage disables optional effects (guarded fallbacks keep pages usable)
- Mock authentication and storage only (localStorage). For production, implement real auth (e.g., Argon2/bcrypt, sessions/JWT, CSRF, rate limiting)

## Template Media Gallery

### GPT5_EduAI
<img width="1775" height="1296" alt="15" src="https://github.com/user-attachments/assets/d3bd1611-eb69-4ffe-866b-51f08c0cdae2" />
<img width="1879" height="1286" alt="14" src="https://github.com/user-attachments/assets/e995077a-6f96-447a-9040-e9d12de7850c" />
<img width="2542" height="1286" alt="13" src="https://github.com/user-attachments/assets/1bfc6083-62ff-4314-838b-6132eb6f768b" />
<img width="1455" height="1301" alt="12" src="https://github.com/user-attachments/assets/d430bd53-1c6a-4c9a-a8a2-f1d24dfbdb98" />
<img width="1332" height="1304" alt="11" src="https://github.com/user-attachments/assets/340ce52f-d65f-4839-9e86-d918c0a31c5c" />
<img width="1470" height="1286" alt="10" src="https://github.com/user-attachments/assets/d345846f-6b87-4d44-b4fb-75f4416129d5" />
<img width="1332" height="1286" alt="9" src="https://github.com/user-attachments/assets/7c6b2cb1-a3a4-4767-8687-3b9837b5b441" />
<img width="1617" height="888" alt="8" src="https://github.com/user-attachments/assets/8b0041a3-e4d7-401f-a690-e7d3815f5dde" />
<img width="1745" height="1302" alt="7" src="https://github.com/user-attachments/assets/93b8fc5d-8ebf-4c43-ab06-cedb45ae860b" />
<img width="1882" height="1175" alt="6" src="https://github.com/user-attachments/assets/f322d825-9d6c-4a54-9b99-2546ec5ec5b8" />
<img width="2537" height="1298" alt="5" src="https://github.com/user-attachments/assets/f26ca090-4441-4e3a-8946-9a5c420603f8" />
<img width="2178" height="1242" alt="4" src="https://github.com/user-attachments/assets/6949fd1d-9019-4191-933a-aeea8392141b" />
<img width="2537" height="1299" alt="3" src="https://github.com/user-attachments/assets/9494c9ef-a247-469d-a8c5-5883286afbf7" />
<img width="2533" height="1301" alt="2" src="https://github.com/user-attachments/assets/aed2545a-109e-4ed3-a62e-c1a329fbd26d" />
<img width="1617" height="888" alt="1" src="https://github.com/user-attachments/assets/de2ca3cc-8642-4027-b97c-8abb4ff7c76c" />



## Contributing
- **Fork** the repository
- **Create a branch** for your template or improvement
- **Add your GPT-5 generated template** following the standard structure
- **Include a detailed README** for your template
- **Submit a pull request** with a clear description

Guidelines:
- **Document well**: Setup, usage, limitations, and customization tips
- **Provide clear setup instructions** and minimal repro steps
- **Test templates** before submitting
- **Use descriptive commit messages** and follow existing naming conventions

## Roadmap (high level)
- Add more frameworks (React, Vue, Angular, Svelte) starter templates
- Expand mobile and backend templates
- Add CI checks for HTML/CSS/JS quality and accessibility
- Optional: per-template screenshots and live previews

## License
Specify a license for this repository (MIT recommended). If omitted, contributions default to the repository’s chosen license when added.


