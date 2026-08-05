# SHADA1st Apparel — Responsive Static Store

A simple, responsive apparel storefront built with vanilla HTML, CSS, and JavaScript. Customers browse products on desktop or mobile and can tap an item to open a pre-filled WhatsApp chat with the store admin to place an order and negotiate details.

## Features

- Mobile-first responsive design for phones and desktops
- Static site using plain HTML/CSS/JS (no build step required)
- Product touch/click opens WhatsApp chat pre-filled with product details
- Easy to host on static hosting (GitHub Pages, Netlify, Vercel, S3, etc.)

## Repository Structure

The project follows a small, well-organized structure;

- css/
	- style.css
- images/
	- logo.jpg
- js/
	- firebase-config.js
	- main.js
- admin.html
- index.html
- products.json
- firestore-rules.txt
- README.md


## How WhatsApp Ordering Works

When a customer taps an item, the site opens a WhatsApp link that routes the customer to the admin's WhatsApp number with a pre-filled message. The link format is:

https://wa.me/<ADMIN_PHONE>?text=<URL_ENCODED_MESSAGE>

Guidelines:

- Use the full international phone number without symbols or leading `+` (for example: `15551234567`).
- URL-encode spaces and special characters in the message (e.g., use `%20` for spaces).

Example HTML link:

```html
<a href="https://wa.me/15551234567?text=I'm%20interested%20in%20Product%20X" target="_blank" rel="noopener">Order on WhatsApp</a>
```

In this repo, update the admin phone number in the JavaScript that creates the WhatsApp link (search the `js/` folder for `wa.me` or an `ADMIN_PHONE` variable and set it to your number).

## Local Development

To test locally, open `index.html` in a browser. For some browsers you may want to serve the folder over a simple HTTP server:

Python 3:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

or use any static server you prefer.

## Deployment

- Deploy the repository root to a static host (GitHub Pages, Netlify, Vercel, etc.).
- Ensure `images/`, `css/`, and `js/` are included in the published bundle.

## Configuration

- Add or update products in `products.json` (if used by the app).
- If you use Firebase, configure `js/firebase-config.js` with your Firebase project settings.
- Set the admin WhatsApp number in the JS file that generates the `wa.me` links.

## Contributing

Pull requests are welcome for bug fixes, improved responsiveness, or accessibility enhancements. For small sites like this, keep changes minimal and test on both desktop and mobile sizes.

## License

This project is provided as-is. Add a license file if you want to choose a specific open-source license.



