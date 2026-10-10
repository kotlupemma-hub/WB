# WhatsFlow - Project Structure

## Note
Node.js is not available on this system. The application is built as a self-contained
multi-file web application using CDN-hosted libraries.

## Structure
```
WABusiness/
├── index.html          # Landing page
├── app.html            # Main application
├── css/
│   ├── main.css        # Core styles
│   ├── components.css  # Component styles
│   └── animations.css  # Animation styles
├── js/
│   ├── app.js          # Main application
│   ├── router.js       # Client-side router
│   ├── store.js        # State management
│   ├── api.js          # API layer (mock + real)
│   ├── pages/          # Page modules
│   └── components/     # Reusable components
└── assets/
    └── images/
```
