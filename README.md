# Keyvia - Secure File Vault & Sharing Platform - by Abhishek Jain (22BEC0237)

<p align="center">
  <img src="https://keyvia.vercel.app/prev.png" alt="KeyVia Banner" width="700"/>
</p>

<p align="center">
  <em>A production-grade, secure file vault system built with Go, React, and PostgreSQL. It supports efficient, deduplicated storage, powerful search, and controlled file sharing, designed for scalability and performance.</em>
  <br/><br/>
  <a href="https://keyvia.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/View%20Live-Frontend-000000?style=for-the-badge&logo=vercel" alt="Live Frontend"/>
  </a>
  &nbsp;
  <a href="https://keyvia-backend-url.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/View%20Live-Backend-46E3B7?style=for-the-badge&logo=render" alt="Live Backend"/>
  </a>
</p>

## ✨ Core Features

This project implements a full suite of features for a modern file management system, with a focus on security, efficiency, and user experience.

* **🗂️ Efficient Storage with Deduplication**: Uploaded files are hashed using SHA-256. Duplicate content is never stored twice; instead, a reference count is used, providing significant storage savings.
* **🚀 Advanced File Uploads**: Supports single, multiple, and drag-and-drop file uploads with a sleek modal interface. It includes client-side MIME type validation to prevent content mismatches.
* **🤝 Powerful Sharing Capabilities**:
    * Share files publicly via a generated link.
    * Share files privately and directly with other registered users.
    * Easily manage and view files you have shared and files that have been shared with you.
* **🔍 Advanced Search & Filtering**: A powerful search bar allows filtering files by filename, MIME type, size range, and date range. Multiple filters can be combined for precise results.
* **📊 Storage Analytics & Admin Panel**:
    * Users can see their storage usage, including total space saved through deduplication, presented in bytes and as a percentage.
    * An admin panel provides a complete overview of all files in the system, user details, and usage statistics.
* **🔐 Secure & Role-Based**: Built with security in mind, using JWT for authentication. Only file owners can delete their files, and the system respects reference counts for deduplicated files.
* **📄 PDF Previews**: Integrated PDF viewer allows users to preview PDF files directly in the browser without needing to download them first.

---

## 🛠️ Tech Stack & Architecture Rationale

This project uses a modern, scalable tech stack, chosen to meet the demands of a high-performance file management system.

| Category      | Technology                                                                                                                                                                                                                                                                              |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend** | <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go"/> <br/> Chosen for its high performance, excellent concurrency support, and strict typing, making it perfect for building a robust and scalable API.                               |
| **Frontend** | <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/> <br/> Selected for its component-based architecture and vast ecosystem, enabling a modern, responsive, and maintainable user interface.                                    |
| **Database** | <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/> <br/> A powerful, open-source relational database known for its reliability and data integrity, managed via **Supabase**.                                    |
| **Deployment**| <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/> <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"/> <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render"/> <br/> Containerized with Docker for consistent local development. Deployed globally with Vercel (Frontend) and Render (Backend). |
| **API** | <img src="https://img.shields.io/badge/REST%20API-0277BD?style=for-the-badge" alt="REST API"/> <br/> A well-defined RESTful API serves as the contract between the frontend and backend, ensuring clear and structured communication.                                                        |

---

## 📦 Database Schema

The database is designed to be efficient and scalable, with clear relationships between users, their files, and the physical, deduplicated files.

The complete schema and migrations, managed via the Supabase CLI, are available in the `/supabase/migrations` directory.

<p align="center">
  <img src="frontend/keyvia/public/diagramdb.png" alt="Database ERD" width="800"/>
  <em>Entity-Relationship Diagram of the KeyVia Database</em>
</p>

---

## 🚀 Getting Started: Local Development

You can run the entire application stack locally using Docker Compose for a simple, one-command setup.

### Prerequisites

* [Go (v1.20+)](https://go.dev/doc/install)
* [Node.js (v18+)](https://nodejs.org/en/)
* [Docker](https://www.docker.com/products/docker-desktop/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone the Repository

```bash
git clone https://github.com/Abhishekkjainn/BalkanID-Task
cd your-repo-name
```

### 2. Configure Environment Variables

Create `.env` files for both the backend and frontend by copying the example files.

**Backend (`backend/.env`):**
```bash
# Copy from backend/.env.example
cp backend/.env.example backend/.env
```
Update `backend/.env` with your local PostgreSQL connection string and a JWT secret.

### 3. Run with Docker Compose

From the root directory, run the following command to build and start all services:

```bash
docker-compose up --build
```

The services will be available at:
* **Frontend (React App)**: `http://localhost:5173`
* **Backend (Go API)**: `http://localhost:8080`

---

## 📄 API Documentation

The backend exposes a full-featured REST API for all file and user operations. A comprehensive specification, including all endpoints, request bodies, and example responses, is available in the Postman Collection.

<a href="https://your-public-postman-collection-link" target="_blank">
  <img src="https://run.pstmn.io/button.svg" alt="Run In Postman"/>
</a>

---
