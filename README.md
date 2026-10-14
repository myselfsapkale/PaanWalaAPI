# PaanWalaAPI

Welcome to the **PaanWalaAPI** developer setup guide. Follow the instructions below to get your local environment up and running.

---

## Prerequisites

Before you begin, make sure you have the following installed on your machine:
- [Node.js (v24 LTS or later)](https://nodejs.org/)
- [Docker & Docker Compose](https://www.docker.com/) (Make sure Docker Desktop is running)

---

## Developer Setup

### 1. Start Docker Services
Bring up the database and search/logging stack (MySQL, MongoDB, Redis, Elasticsearch, Logstash, and Kibana) using Docker Compose:

```bash
docker compose up -d