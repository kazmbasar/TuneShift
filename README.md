# TuneShift: Spotify to YouTube Transfer

TuneShift is a premium web application that allows you to seamlessly transfer your playlists from Spotify to YouTube Music.

## Features

- **Beautiful UI**: Modern, glassmorphism-inspired design with smooth animations.
- **Secure Authentication**: Uses NextAuth for secure Spotify and Google authentication.
- **Playlist Management**: View and select multiple playlists to transfer.
- **One-Click Transfer**: (In Progress) Automates the process of moving songs.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a file named `.env.local` in the root directory. You will need API credentials from Spotify and Google.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_string_here

# Google Cloud Console (https://console.cloud.google.com)
# Enable YouTube Data API v3
# Redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Technologies Used

- **Next.js 15+** (App Router)
- **TypeScript**
- **NextAuth.js**
- **CSS Modules** (Custom Design System)
- **Google Fonts** (Outfit)
<img width="1867" height="922" alt="image" src="https://github.com/user-attachments/assets/31d270dd-531b-48ba-a9a1-4f4819eb96a4" />
<img width="1868" height="900" alt="image" src="https://github.com/user-attachments/assets/5c38fa8e-1df4-4288-9d64-32f9cf11175e" />

