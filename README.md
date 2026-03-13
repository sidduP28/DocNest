# DocNest - Healthcare Platform

DocNest is a comprehensive healthcare management platform designed to streamline patient-hospital interactions. It provides a seamless experience for finding hospitals, checking real-time wait times, and booking appointments.

## Key Features

- **Hospital Discovery**: Search for hospitals by location, type (Government/Private), and ratings.
- **Real-time Wait Times**: Automatic prediction of wait times using appointment data and doctor availability.
- **Appointment Booking**: Easy slot picking and booking for various specialties.
- **Symptom Checker**: AI-powered preliminary health assessment based on user-provided symptoms.
- **Blood Bank Integration**: Unified platform for blood request management.
- **User Dashboard**: Personalized dashboards for patients to track their medical history and upcoming visits.

## Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Leaflet (Maps)
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (Mongoose)
- **Authentication**: Firebase Authentication
- **Deployment**: Configured for Vercel

## Project Structure

```text
DocNest/
├── frontend/             # React client-side application
├── backend/              # Node.js REST API and Socket.io server
├── vercel.json           # Deployment configuration
└── README.md             # Documentation
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB connection string
- Firebase project configuration

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sidduP28/DocNest.git
   cd DocNest
   ```

2. Install dependencies:
   ```bash
   # In frontend directory
   cd frontend && npm install
   
   # In backend directory
   cd ../backend && npm install
   ```

3. Set up environment variables (.env files in frontend and backend).

4. Start the development servers:
   ```bash
   # Backend
   npm run dev
   
   # Frontend
   npm run dev
   ```

## License

This project is licensed under the MIT License.
