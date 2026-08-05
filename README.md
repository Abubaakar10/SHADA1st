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

When a customer taps an item, the site opens a WhatsApp link that routes the customer to the admin's WhatsApp number with a pre-filled message. 


## Local Development

To test locally, open `index.html` in a browser. For some browsers you may want to serve the folder over a simple HTTP server:

Python 3:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

or use any static server you prefer.

## Deployment

Hosted on Vercel.

## Contributing

Pull requests are welcome for bug fixes, improved responsiveness, or accessibility enhancements. For small sites like this, keep changes minimal and test on both desktop and mobile sizes.





